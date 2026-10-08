// Room codes: "<building><sep><floor>.<room>", where the building is an HSWT code from the
// site plan (A6, H10, C4 …). Accepted examples: "A6 1.12", "H10.E.07", "H10 0.07", "C4-1.03",
// "D1 U.04", "F9 EG.12". Floor 0 / E / EG is the ground floor; U / UG / -1 is the basement.

const REST_RE = /^[\s.]*(EG|UG|E|U|-?\d)\s*\.?\s*(\d{1,3}[a-z]?)\s*$/i;

function parseFloor(token) {
  const f = token.toUpperCase();
  if (f === 'E' || f === 'EG') return 0;
  if (f === 'U' || f === 'UG') return -1;
  return Number(f);
}

// `buildingIds`: known building codes, e.g. ["A1", "A10", "H10", …]
export function parseRoomCode(input, buildingIds) {
  const raw = String(input ?? '').trim().toUpperCase();
  if (!raw) return null;
  // Longest code first so "A10 1.02" is building A10, not A1.
  const ids = [...buildingIds].sort((a, b) => b.length - a.length);
  for (const id of ids) {
    if (!raw.startsWith(id.toUpperCase())) continue;
    const m = REST_RE.exec(raw.slice(id.length));
    if (!m) continue;
    const floor = parseFloor(m[1]);
    const room = m[2].padStart(2, '0');
    return { building: id, floor, room, code: `${id} ${floor}.${room}` };
  }
  return null;
}

// Resolve a room code against a campus. Returns null when it isn't a room on this campus.
export function locateRoom(input, campus) {
  const parsed = parseRoomCode(input, campus.buildings.map((b) => b.id));
  if (!parsed) return null;
  const building = campus.buildings.find((b) => b.id === parsed.building);
  const floorKnown = !building.floors || building.floors.includes(parsed.floor);
  return { ...parsed, buildingRef: building, floorKnown };
}

// A plain building code ("H10", "a6") → building, so classes with only a building still navigate.
export function locateBuilding(input, campus) {
  const raw = String(input ?? '').trim().toUpperCase();
  return campus.buildings.find((b) => b.id.toUpperCase() === raw) ?? null;
}
