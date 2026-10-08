// Real walking directions from free OpenStreetMap routing services.
//
//   1. FOSSGIS Valhalla (valhalla1.openstreetmap.de) – pedestrian or wheelchair profile,
//      turn-by-turn instructions in German/English.
//   2. FOSSGIS OSRM foot profile (routing.openstreetmap.de) – geometry only, no step-free option.
//   3. Offline straight-line estimate.
//
// Both services are the ones openstreetmap.org uses for its own directions; they are free for
// light use. For production traffic, self-host Valhalla or use a keyed provider (see README).

import { estimateWalk, walkingMinutes } from './routing.js';

export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
export const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
const TIMEOUT_MS = 8000;

// Google encoded polyline; Valhalla uses precision 6, Google/OSRM precision 5.
export function decodePolyline(str, precision = 6) {
  const factor = 10 ** precision;
  const coords = [];
  let lat = 0;
  let lng = 0;
  let i = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = str.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

export function valhallaRequestUrl(from, to, { stepFree = false, lang = 'de' } = {}) {
  const body = {
    locations: [
      { lat: from[0], lon: from[1] },
      { lat: to[0], lon: to[1] },
    ],
    costing: 'pedestrian',
    costing_options: { pedestrian: stepFree ? { type: 'wheelchair' } : {} },
    directions_options: { units: 'kilometers', language: lang === 'de' ? 'de-DE' : 'en-US' },
  };
  return `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(body))}`;
}

export function parseValhalla(json) {
  const leg = json?.trip?.legs?.[0];
  if (!leg?.shape) return null;
  return {
    provider: 'Valhalla (FOSSGIS)',
    coords: decodePolyline(leg.shape, 6),
    meters: json.trip.summary.length * 1000,
    minutes: Math.max(1, Math.round(json.trip.summary.time / 60)),
    steps: (leg.maneuvers ?? [])
      .filter((m) => m.instruction)
      .map((m) => ({ text: m.instruction, meters: (m.length ?? 0) * 1000 })),
    approx: false,
  };
}

export function osrmRequestUrl(from, to) {
  return `${OSRM_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
}

export function parseOsrm(json) {
  const route = json?.routes?.[0];
  if (json?.code !== 'Ok' || !route) return null;
  return {
    provider: 'OSRM (FOSSGIS)',
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    meters: route.distance,
    minutes: walkingMinutes(route.distance),
    steps: [],
    approx: false,
    noStepFree: true,
  };
}

async function fetchJson(url, fetchImpl) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getDirections(from, to, options = {}, fetchImpl = globalThis.fetch) {
  try {
    const route = parseValhalla(await fetchJson(valhallaRequestUrl(from, to, options), fetchImpl));
    if (route) return route;
  } catch {
    /* fall through to OSRM */
  }
  try {
    const route = parseOsrm(await fetchJson(osrmRequestUrl(from, to), fetchImpl));
    if (route) return { ...route, noStepFree: !!options.stepFree };
  } catch {
    /* fall through to estimate */
  }
  return { provider: null, coords: [from, to], steps: [], ...estimateWalk(from, to) };
}
