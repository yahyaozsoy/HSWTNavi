// Walking routes on the campus path graph (Dijkstra over a small graph).

const EARTH_RADIUS_M = 6371000;
export const WALKING_SPEED_M_PER_MIN = 80; // ~4.8 km/h
const STAIRS_PENALTY = 1.5; // stairs are shorter on the map but slower to climb

export function distanceMeters([lat1, lng1], [lat2, lng2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function buildGraph(campus, { avoidStairs = false } = {}) {
  const adj = new Map(Object.keys(campus.nodes).map((id) => [id, []]));
  for (const [from, to, opts = {}] of campus.edges) {
    if (!adj.has(from) || !adj.has(to)) throw new Error(`Edge references unknown node: ${from}-${to}`);
    if (avoidStairs && opts.stairs) continue;
    const meters = distanceMeters(campus.nodes[from], campus.nodes[to]);
    const cost = opts.stairs ? meters * STAIRS_PENALTY : meters;
    adj.get(from).push({ to, meters, cost, stairs: !!opts.stairs });
    adj.get(to).push({ to: from, meters, cost, stairs: !!opts.stairs });
  }
  return adj;
}

export function nearestNode(campus, latlng) {
  let best = null;
  for (const [id, pos] of Object.entries(campus.nodes)) {
    const d = distanceMeters(latlng, pos);
    if (!best || d < best.meters) best = { id, meters: d };
  }
  return best;
}

// Returns { nodes, coords, meters, minutes, stairs } or null if unreachable.
export function findRoute(campus, fromNode, toNode, options = {}) {
  const adj = buildGraph(campus, options);
  if (!adj.has(fromNode) || !adj.has(toNode)) return null;

  const cost = new Map([[fromNode, 0]]);
  const prev = new Map();
  const done = new Set();

  while (true) {
    let current = null;
    for (const [id, c] of cost) {
      if (!done.has(id) && (current === null || c < cost.get(current))) current = id;
    }
    if (current === null) return null;
    if (current === toNode) break;
    done.add(current);
    for (const edge of adj.get(current)) {
      const next = cost.get(current) + edge.cost;
      if (next < (cost.get(edge.to) ?? Infinity)) {
        cost.set(edge.to, next);
        prev.set(edge.to, { from: current, edge });
      }
    }
  }

  const nodes = [toNode];
  let meters = 0;
  let stairs = false;
  while (nodes[0] !== fromNode) {
    const step = prev.get(nodes[0]);
    meters += step.edge.meters;
    stairs ||= step.edge.stairs;
    nodes.unshift(step.from);
  }
  return {
    nodes,
    coords: nodes.map((id) => campus.nodes[id]),
    meters,
    minutes: walkingMinutes(meters),
    stairs,
  };
}

export function walkingMinutes(meters) {
  return Math.max(1, Math.ceil(meters / WALKING_SPEED_M_PER_MIN));
}
