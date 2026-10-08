// Search across rooms, buildings, services and the user's own classes.

import { floorLabel, locateRoom } from './rooms.js';

// Lowercase, accent-free. German umlauts become "ae/oe/ue" (or plain "a/o/u" with `transliterate: false`).
export function normalize(s, { transliterate = true } = {}) {
  let t = String(s ?? '').toLowerCase();
  if (transliterate) t = t.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  return t
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreForm(query, t) {
  if (!t) return 0;
  if (t === query) return 100;
  if (t.startsWith(query)) return 80;
  if (t.split(/[\s/–-]+/).some((w) => w.startsWith(query))) return 60;
  if (t.includes(query)) return 40;
  return 0;
}

// `query` is already normalized; the text is tried in both umlaut spellings.
function scoreText(query, text) {
  return Math.max(scoreForm(query, normalize(text)), scoreForm(query, normalize(text, { transliterate: false })));
}

// places: output of placesOf(campus); classes: schedule entries
export function search(query, { campus, places, classes = [] }) {
  const q = normalize(query);
  if (!q) return [];
  const results = [];

  const room = locateRoom(query, campus);
  if (room) {
    results.push({
      type: 'room',
      score: 120,
      title: `Room ${room.code}`,
      subtitle: `${room.buildingRef.name}, ${floorLabel(room.floor)}${room.floorKnown ? '' : ' (floor not on record)'}`,
      placeId: room.buildingRef.id,
    });
  }

  for (const p of places) {
    const score = Math.max(
      scoreText(q, p.id) + (normalize(p.id) === q ? 20 : 0),
      scoreText(q, p.name),
      ...(p.aliases ?? []).map((a) => scoreText(q, a) - 5),
      scoreText(q, p.description) / 2,
    );
    if (score > 0) results.push({ type: p.kind, score, title: p.name, subtitle: p.description, placeId: p.id });
  }

  for (const c of classes) {
    const score = Math.max(scoreText(q, c.title), scoreText(q, c.room) - 10);
    if (score > 0) {
      const loc = locateRoom(c.room, campus);
      results.push({
        type: 'class',
        score: score - 1,
        title: c.title,
        subtitle: `Your class · ${c.room || 'no room set'}`,
        placeId: loc?.buildingRef.id ?? null,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}
