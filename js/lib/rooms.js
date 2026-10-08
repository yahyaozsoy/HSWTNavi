// Room codes follow "<building><floor>.<room>", e.g. "D2.04", "B 0.01", "C-1.12", "CU.12".
// Floor 0 is the ground floor (EG), negative / "U" floors are basements.

const ROOM_RE = /^\s*([A-Za-z]{1,2})\s*(-?\d|U|EG|E)\s*\.\s*(\d{1,3}[a-zA-Z]?)\s*$/;

export function parseRoomCode(input) {
  const m = ROOM_RE.exec(String(input ?? ''));
  if (!m) return null;
  const building = m[1].toUpperCase();
  const rawFloor = m[2].toUpperCase();
  const floor = rawFloor === 'U' ? -1 : rawFloor === 'E' || rawFloor === 'EG' ? 0 : Number(rawFloor);
  const room = m[3].toUpperCase().padStart(2, '0');
  return { building, floor, room, code: `${building}${floor}.${room}` };
}

export function floorLabel(floor) {
  if (floor === 0) return 'ground floor';
  if (floor < 0) return floor === -1 ? 'basement' : `basement ${-floor}`;
  const suffix = floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th';
  return `${floor}${suffix} floor`;
}

// Resolve a room code against a campus. Returns null when the building is unknown.
export function locateRoom(input, campus) {
  const parsed = parseRoomCode(input);
  if (!parsed) return null;
  const building = campus.buildings.find((b) => b.id.toUpperCase() === parsed.building);
  if (!building) return null;
  const floorKnown = !building.floors || building.floors.includes(parsed.floor);
  return { ...parsed, buildingRef: building, floorKnown };
}
