#!/usr/bin/env python3
"""Generate js/data/weihenstephan.generated.js from the official HSWT site plan.

The HSWT "Lageplan Weihenstephan" PDF is a vector drawing. This script

1. reads the building footprints (filled paths) and labels (text) from the PDF,
2. georeferences the plan by matching the plan's building centroids against the
   surveyed building coordinates published by TUM's NavigaTUM project
   (iterative closest point, similarity transform: scale + rotation + offset),
3. assigns every HSWT-green footprint to its building code (A1, H10, ...),
4. adds real public-transport stops (DELFI / MVV data via NavigaTUM),
5. writes everything as a JS module with WGS84 coordinates.

Usage:
    pip install pymupdf numpy shapely pandas pyarrow
    git clone --depth 1 --filter=blob:limit=5m --sparse https://github.com/TUM-Dev/NavigaTUM
    (cd NavigaTUM && git sparse-checkout set data/external/results)
    python3 tools/build_campus_data.py hswt-lageplan-weihenstephan.pdf NavigaTUM/data/external/results
"""

import csv
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pymupdf
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

HSWT_GREEN = "#79b829"
GREY = "#878786"
RESIDENCE = "#8a5525"
HSG = "#a05667"
GASTRO = "#10662e"
PARKING = "#365ca7"
LABEL_GREEN = "#7ab929"
LABEL_RESIDENCE = "#8b5525"
LEGEND_X = 610  # everything right of this (top area) is the legend

# Local metric frame around the campus (equirectangular is accurate to <0.1 % at this size).
LAT0, LON0 = 48.3975, 11.725
KX = 111320 * math.cos(math.radians(LAT0))
KY = 111132.0

# Footprints that carry no building code on the plan, or whose nearest label is wrong.
# Keyed by plan coordinates (pt) of the footprint centroid, matched within 3 pt.
LABEL_OVERRIDES = [
    ((487, 477), "A1"),  # A1 + A2 are one polygon; A6 label sits just below it
    ((484, 490), "A5"),  # A6 bar + A5 courtyard + A7 block are one polygon
    ((506, 488), "A3"),  # the A4 label is nearer to A3's edge
    ((496, 495), "A4"),
    ((519, 501), None),
    ((505, 300), None),
    ((524, 320), None),
    ((442, 265), None),
    ((384, 237), None),
    ((493, 257), None),
    ((472, 272), "H10"),
    ((474, 278), "H10"),
    ((488, 283), "H20"),
    ((483, 283), "H20"),
    ((496, 280), "H19"),
    ((496, 287), "H19"),
    ((467, 304), "H11"),
    ((471, 313), "H11"),
    ((451, 268), "H6"),
    ((452, 285), "H6"),
    ((459, 275), None),  # tree symbol
    ((237, 184), None),
    ((230, 179), None),
    ((260, 182), None),
]

# Buildings that share one footprint polygon get a marker at their own part (plan pt).
MARKER_OVERRIDES = {
    "A1": (478.0, 474.5),
    "A2": (503.4, 473.0),
    "A5": (489.0, 488.8),
    "A6": (480.6, 488.8),
    "A7": (478.4, 494.4),
}


def to_m(lat, lon):
    return np.array([(lon - LON0) * KX, (lat - LAT0) * KY])


def to_ll(m):
    return round(LAT0 + m[1] / KY, 6), round(LON0 + m[0] / KX, 6)


def hexcolor(rgb):
    return "#%02x%02x%02x" % tuple(int(c * 255) for c in rgb)


def read_shapes(page):
    shapes = []
    for d in page.get_drawings():
        fill = d.get("fill")
        if not fill:
            continue
        pts = []
        for item in d["items"]:
            if item[0] == "l":
                pts += [item[1], item[2]]
            elif item[0] == "c":
                pts += [item[1], item[4]]
            elif item[0] == "re":
                r = item[1]
                pts += [r.tl, r.tr, r.br, r.bl]
            elif item[0] == "qu":
                q = item[1]
                pts += [q.ul, q.ur, q.lr, q.ll]
        if len(pts) < 3:
            continue
        poly = Polygon([(p.x, p.y) for p in pts]).buffer(0)
        if poly.is_empty:
            continue
        shapes.append({"color": hexcolor(fill), "poly": poly, "c": shoelace_centroid(pts)})
    return shapes


def shoelace_centroid(pts):
    """Centroid of the drawn path's vertices (robust for multi-part paths, unlike a repaired polygon)."""
    xy = np.array([(p.x, p.y) for p in pts])
    x, y = xy[:, 0], xy[:, 1]
    x1, y1 = np.roll(x, -1), np.roll(y, -1)
    cross = x * y1 - x1 * y
    area = cross.sum() / 2
    if abs(area) < 1e-6:
        return xy.mean(0)
    return np.array([((x + x1) * cross).sum() / (6 * area), ((y + y1) * cross).sum() / (6 * area)])


def read_labels(page, color):
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                x0, y0, x1, y1 = span["bbox"]
                if "#%06x" % span["color"] == color and x0 < LEGEND_X:
                    out.append((span["text"].strip(), ((x0 + x1) / 2, (y0 + y1) / 2)))
    return out


def fit_similarity(plan_pts, metre_pts):
    """Least-squares similarity transform plan(pt, y down) -> metres(E, N)."""
    P = np.array(plan_pts) * np.array([1, -1])
    Q = np.array(metre_pts)
    mp, mq = P.mean(0), Q.mean(0)
    a = (P - mp) @ np.array([1, 1j])
    b = (Q - mq) @ np.array([1, 1j])
    z = (np.conj(a) @ b) / (np.conj(a) @ a)

    def transform(pt):
        w = complex(*(np.array(pt) * np.array([1, -1]) - mp)) * z
        return np.array([w.real, w.imag]) + mq

    return transform, z


def georeference(shapes, navigatum_dir):
    ref = []
    with open(Path(navigatum_dir) / "buildings_roomfinder.csv") as f:
        for r in csv.DictReader(f):
            if r["b_id"][:2] in ("41", "42", "43") and r["lat"]:
                ref.append((r["b_id"], to_m(float(r["lat"]), float(r["lon"]))))
    ref_by_id = dict(ref)
    candidates = [s for s in shapes if s["color"] in (GREY, HSWT_GREEN) and s["poly"].area > 2]
    hsg = next(s for s in shapes if s["color"] == HSG)
    a1 = min((s for s in shapes if s["color"] == HSWT_GREEN), key=lambda s: np.hypot(*(s["c"] - (487, 477))))
    # Seed with two unambiguous buildings that NavigaTUM also lists, plus Freising cathedral
    # (Wikimedia Commons: 48°23'55.79"N 11°44'45.46"E; drawn at plan pt 806.8/390.7).
    T, z = fit_similarity(
        [a1["c"], hsg["c"], (806.8, 390.7)],
        [ref_by_id["4176"], ref_by_id["4299"], to_m(48.398831, 11.745961)],
    )
    for it in range(10):
        pairs = []
        for _, q in ref:
            best = min(candidates, key=lambda s: np.hypot(*(T(s["c"]) - q)))
            pairs.append((np.hypot(*(T(best["c"]) - q)), best["c"], q))
        threshold = 40 if it < 3 else 20
        good = [p for p in pairs if p[0] < threshold]
        T, z = fit_similarity([p[1] for p in good], [p[2] for p in good])
    residuals = [np.hypot(*(T(p[1]) - p[2])) for p in good]
    stats = {
        "matchedBuildings": len(good),
        "medianErrorM": round(float(np.median(residuals)), 1),
        "rmsErrorM": round(float(np.sqrt(np.mean(np.square(residuals)))), 1),
        "metresPerPt": round(abs(z), 4),
        "rotationDeg": round(math.degrees(np.angle(z)), 3),
    }
    return T, stats


def nearest_label(poly, labels):
    return min(labels, key=lambda L: poly.distance(Point(L[1])))


def override_for(c):
    for (x, y), code in LABEL_OVERRIDES:
        if abs(c[0] - x) < 3 and abs(c[1] - y) < 3:
            return True, code
    return False, None


def ring_ll(poly, T):
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda g: g.area)
    simplified = poly.simplify(0.15)
    return [list(to_ll(T(p))) for p in list(simplified.exterior.coords)[:-1]]


def main(pdf_path, navigatum_dir, out_path):
    page = pymupdf.open(pdf_path)[0]
    shapes = read_shapes(page)
    T, stats = georeference(shapes, navigatum_dir)
    print("georeference:", stats, file=sys.stderr)

    labels = read_labels(page, LABEL_GREEN)
    buildings = {}
    unlabeled = []
    for s in shapes:
        if s["color"] != HSWT_GREEN or s["poly"].area < 5:
            continue
        found, code = override_for(s["c"])
        if not found:
            code = nearest_label(s["poly"], labels)[0]
        if code is None:
            unlabeled.append(ring_ll(s["poly"], T))
            continue
        buildings.setdefault(code, []).append(s["poly"])

    out_buildings = {}
    for code, polys in buildings.items():
        union = unary_union(polys)
        out_buildings[code] = {
            "latlng": list(to_ll(T(MARKER_OVERRIDES.get(code, union.centroid.coords[0])))),
            "footprints": [ring_ll(p, T) for p in polys],
        }
    for code in MARKER_OVERRIDES:  # buildings without their own polygon (A2, A6, A7)
        if code not in out_buildings:
            out_buildings[code] = {"latlng": list(to_ll(T(MARKER_OVERRIDES[code]))), "footprints": []}

    residence_labels = read_labels(page, LABEL_RESIDENCE)
    residences = {}
    for s in shapes:
        if s["color"] == RESIDENCE and s["poly"].area > 5:
            code = nearest_label(s["poly"], residence_labels)[0]
            residences.setdefault(code, []).append(s["poly"])
    out_residences = {
        code: {"latlng": list(to_ll(T(unary_union(p).centroid.coords[0]))), "footprints": [ring_ll(x, T) for x in p]}
        for code, p in residences.items()
    }
    hsg = next(s for s in shapes if s["color"] == HSG)
    out_hsg = {"latlng": list(to_ll(T(hsg["c"]))), "footprints": [ring_ll(hsg["poly"], T)]}

    def icon_positions(color, min_area, max_area):
        return [
            list(to_ll(T(s["c"])))
            for s in shapes
            if s["color"] == color and min_area < s["poly"].area < max_area and s["c"][0] < LEGEND_X
        ]

    parking = icon_positions(PARKING, 15, 40)

    # Real stop names and coordinates (DELFI GTFS via NavigaTUM), clipped to the plan area.
    corners = [to_ll(T(p)) for p in [(0, 0), (LEGEND_X, 0), (0, 600), (852, 600)]]
    lat_min, lat_max = min(c[0] for c in corners), max(c[0] for c in corners)
    lon_min, lon_max = min(c[1] for c in corners), max(c[1] for c in corners)
    df = pd.read_parquet(Path(navigatum_dir) / "public_transport.parquet")
    df = df[df.lat.between(lat_min, lat_max) & df.lon.between(lon_min, lon_max)]
    stops = [
        {"name": r["name"].replace("Freising,", "").replace("Freising, ", "").strip() or "Freising Bahnhof",
         "latlng": [round(r["lat"], 6), round(r["lon"], 6)],
         "modes": list(r["modes"])}
        for _, r in df.iterrows()
    ]

    data = {
        "source": "HSWT Lageplan Weihenstephan (PDF), georeferenced against NavigaTUM building coordinates",
        "georeference": stats,
        "buildings": dict(sorted(out_buildings.items())),
        "unlabeledFootprints": unlabeled,
        "residences": dict(sorted(out_residences.items())),
        "hsg": out_hsg,
        "parking": parking,
        "stops": sorted(stops, key=lambda s: s["name"]),
    }
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    Path(out_path).write_text(
        "// GENERATED by tools/build_campus_data.py – do not edit by hand.\n"
        f"// {data['source']}.\n"
        f"export default {body};\n",
        encoding="utf-8",
    )
    print(f"wrote {out_path}: {len(out_buildings)} buildings, {len(stops)} stops, {len(parking)} car parks", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out = sys.argv[3] if len(sys.argv) > 3 else Path(__file__).resolve().parent.parent / "js/data/weihenstephan.generated.js"
    main(sys.argv[1], sys.argv[2], out)
