"""Snap georeferenced site-plan buildings onto real OpenStreetMap footprints.

The HSWT site plan is drawn schematically: a single similarity transform places most
buildings within ~10 m but some by up to ~70 m. OpenStreetMap (via the Overture Maps
buildings theme) has most HSWT buildings mapped and named with their code ("A6", "H10",
"A8 Zentralbibliothek"). This module

1. uses the OSM footprint for every building whose code is named in OSM,
2. corrects the remaining plan positions with a "rubber sheet": the residual offsets of
   nearby matched buildings, inverse-distance weighted,
3. snaps those corrected footprints to the overlapping OSM building, if there is one.
"""

import re

import numpy as np
import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import Polygon
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

CODE_RE = re.compile(r"^([ACDFH]\d{1,2}[A-Z]?)(?:\s|$)")


def load_osm_buildings(path, lonlat_to_m):
    out = []
    for r in pq.read_table(path, columns=["id", "names", "num_floors", "class", "geometry"]).to_pylist():
        g = wkb.loads(r["geometry"])
        if g.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        name = (r["names"] or {}).get("primary") or ""
        m = CODE_RE.match(name)
        out.append(
            {
                "id": r["id"],
                "name": name,
                "code": m.group(1) if m else None,
                "floors": r["num_floors"],
                "geom": shp_transform(lonlat_to_m, g),
            }
        )
    return out


class RubberSheet:
    """Similarity transform plus inverse-distance-weighted local corrections."""

    def __init__(self, T, plan_pts, metre_pts, k=6, radius=400.0):
        self.T, self.k, self.radius = T, k, radius
        self.base = np.array([T(p) for p in plan_pts])
        self.res = np.array(metre_pts) - self.base

    def correction(self, base, exclude=None):
        d = np.hypot(*(self.base - base).T)
        idx = [i for i in np.argsort(d)[: self.k + 1] if i != exclude and d[i] < self.radius][: self.k]
        if not idx:
            return np.zeros(2)
        w = 1.0 / (d[idx] ** 2 + 100.0)
        w0 = 1.0 / self.radius**2  # pulls the correction back to zero far from any match
        return (w[:, None] * self.res[idx]).sum(0) / (w.sum() + w0)

    def __call__(self, pt):
        base = self.T(pt)
        return base + self.correction(base)

    def leave_one_out(self):
        plain = np.hypot(*self.res.T)
        corrected = np.array(
            [np.hypot(*(self.res[i] - self.correction(self.base[i], exclude=i))) for i in range(len(self.base))]
        )
        return {
            "controlPoints": len(self.base),
            "medianErrorPlainM": round(float(np.median(plain)), 1),
            "medianErrorCorrectedM": round(float(np.median(corrected)), 1),
            "p90ErrorCorrectedM": round(float(np.percentile(corrected, 90)), 1),
        }


def warp_polygon(poly, f):
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda g: g.area)
    return Polygon([tuple(f(p)) for p in poly.exterior.coords]).buffer(0)


def best_overlap(poly_m, candidates, min_score=0.3):
    best, score = None, 0.0
    for b in candidates:
        if not poly_m.intersects(b["geom"]):
            continue
        s = poly_m.intersection(b["geom"]).area / min(poly_m.area, b["geom"].area)
        if s > score:
            best, score = b, s
    return (best, score) if score >= min_score else (None, score)


def osm_code_groups(osm):
    groups = {}
    for b in osm:
        if b["code"]:
            groups.setdefault(b["code"], []).append(b)
    return groups


def code_control_points(plan_polys_by_code, osm_groups, metres_per_pt, skip):
    """Plan centroid ↔ OSM centroid for codes drawn as comparable shapes on both."""
    pts = []
    for code, polys in plan_polys_by_code.items():
        if code in skip or code not in osm_groups:
            continue
        plan = unary_union(polys)
        osm = unary_union([b["geom"] for b in osm_groups[code]])
        ratio = plan.area * metres_per_pt**2 / osm.area
        if 0.5 < ratio < 2:
            c = plan.centroid
            pts.append((code, (c.x, c.y), np.array(osm.centroid.coords[0])))
    return pts
