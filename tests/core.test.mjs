import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CAMPUSES, getCampus, placesOf } from '../js/data/campus.js';
import { parseRoomCode, locateRoom, locateBuilding } from '../js/lib/rooms.js';
import { distanceMeters, estimateWalk, nearest } from '../js/lib/routing.js';
import { openingStatus } from '../js/lib/hours.js';
import { nextEvent, eventsOn, leaveBy, parseIcs } from '../js/lib/schedule.js';
import { search, normalize } from '../js/lib/search.js';
import { createI18n, detectLanguage } from '../js/lib/i18n.js';

const ws = getCampus('weihenstephan');
const de = createI18n('de');
const en = createI18n('en');
const ids = ws.buildings.map((b) => b.id);

test('campus has every building from the site plan', () => {
  const expected = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11',
    'C4', 'C5', 'C6', 'D1', 'F9', 'F10',
    'H1', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H14', 'H19', 'H20', 'H21',
  ];
  assert.deepEqual([...ids].sort(), [...expected].sort());
  for (const b of ws.buildings) {
    const [lat, lng] = b.latlng;
    assert.ok(lat > 48.39 && lat < 48.41 && lng > 11.71 && lng < 11.74, `${b.id} lies on the Weihenstephan hill`);
  }
  // Dean's offices and services from the plan legend carry a description.
  for (const id of ['A3', 'A5', 'A6', 'A8', 'C4', 'D1', 'F9', 'H10']) {
    assert.ok(ws.buildings.find((b) => b.id === id).description, `${id} has a description`);
  }
});

test('georeferencing matches independent surveyed coordinates', () => {
  assert.ok(ws.georeference.medianErrorM < 10, `median error ${ws.georeference.medianErrorM} m`);
  assert.ok(ws.georeference.matchedBuildings >= 50);
  // Hochschulgemeinde – NavigaTUM building 4299.
  const hsg = ws.pois.find((p) => p.id === 'hsg');
  assert.ok(distanceMeters(hsg.latlng, [48.397678, 11.720478]) < 15);
  // Building A9 is the Kustermannhalle; HSWT A1 – NavigaTUM 4176 – lies in the A-building cluster.
  const a1 = ws.buildings.find((b) => b.id === 'A1');
  assert.ok(distanceMeters(a1.latlng, [48.395878, 11.730308]) < 60);
  // Freising station (DELFI stop) vs. Wikipedia 48°23′43″N 11°44′39″E.
  assert.ok(distanceMeters(ws.station, [48.39528, 11.74417]) < 30);
});

test('room codes parse against known building codes', () => {
  assert.deepEqual(parseRoomCode('A6 1.12', ids), { building: 'A6', floor: 1, room: '12', code: 'A6 1.12' });
  assert.equal(parseRoomCode('h10.e.07', ids).code, 'H10 0.07');
  assert.equal(parseRoomCode('H10 EG.7', ids).code, 'H10 0.07');
  assert.equal(parseRoomCode('C4-1.03', ids).floor, -1);
  assert.equal(parseRoomCode('D1 U.04', ids).floor, -1);
  assert.equal(parseRoomCode('A10 2.01', ids).building, 'A10'); // longest code wins
  assert.equal(parseRoomCode('A1 2.01', ids).building, 'A1');
  assert.equal(parseRoomCode('Z9 1.01', ids), null);
  assert.equal(parseRoomCode('Mensa', ids), null);
  assert.equal(parseRoomCode('', ids), null);
});

test('rooms and plain building codes resolve to buildings', () => {
  assert.equal(locateRoom('A8 0.01', ws).buildingRef.id, 'A8');
  assert.equal(locateBuilding('h10', ws).id, 'H10');
  assert.equal(locateBuilding('Q1', ws), null);
});

test('walking estimates and nearest place', () => {
  const a8 = ws.buildings.find((b) => b.id === 'A8').latlng;
  const h10 = ws.buildings.find((b) => b.id === 'H10').latlng;
  const est = estimateWalk(a8, h10);
  assert.ok(est.meters > 800 && est.meters < 1400, `${est.meters} m`);
  assert.ok(est.approx);
  assert.equal(nearest(ws.buildings, h10).item.id, 'H10');
});

test('opening hours status and formatting', () => {
  const hours = { 1: [['11:00', '13:30']], 2: [['11:00', '13:30']] };
  const mon = (h, m) => new Date(2026, 9, 5, h, m); // Mon 5 Oct 2026
  assert.equal(mon(5, 0).getDay(), 1);

  const open = openingStatus(hours, mon(12, 0));
  assert.deepEqual(open, { known: true, open: true, closesAt: '13:30', closingSoon: false });
  assert.equal(de.openingStatus(open), 'Geöffnet · bis 13:30 Uhr');
  assert.equal(en.openingStatus(open), 'Open · closes 13:30');
  assert.equal(openingStatus(hours, mon(13, 15)).closingSoon, true);

  assert.equal(de.openingStatus(openingStatus(hours, mon(9, 0))), 'Geschlossen · öffnet heute 11:00 Uhr');
  assert.equal(en.openingStatus(openingStatus(hours, mon(15, 0))), 'Closed · opens tomorrow 11:00');
  // Weekday abbreviations come from Intl ("Mo." in browsers, "Mo" in some Node ICU builds).
  assert.equal(de.openingStatus(openingStatus(hours, new Date(2026, 9, 7, 9))), `Geschlossen · öffnet ${de.weekday(1, true)} 11:00 Uhr`);
  assert.equal(en.openingStatus(openingStatus(hours, new Date(2026, 9, 7, 9))), 'Closed · opens Mon 11:00');
  assert.equal(openingStatus(undefined).known, false);
});

test('next class, today list and leave-by time', () => {
  const classes = [
    { id: '1', title: 'Botanik', room: 'A6 0.01', day: 1, start: '08:15', end: '09:45' },
    { id: '2', title: 'Statistik', room: 'H10 1.04', day: 1, start: '10:00', end: '11:30' },
    { id: '3', title: 'Exkursion', room: 'A8 0.01', date: '2026-10-07', start: '09:00', end: '12:00' },
  ];
  const mon = (h, m) => new Date(2026, 9, 5, h, m);

  assert.equal(eventsOn(classes, mon(0, 0)).length, 2);
  const during = nextEvent(classes, mon(8, 30));
  assert.equal(during.entry.title, 'Botanik');
  assert.equal(during.ongoing, true);
  const between = nextEvent(classes, mon(9, 50));
  assert.equal(between.entry.title, 'Statistik');
  assert.equal(between.ongoing, false);
  assert.equal(nextEvent(classes, mon(12, 0)).entry.title, 'Exkursion');
  assert.equal(nextEvent([], mon(12, 0)), null);

  const leave = leaveBy(between.startsAt, 4, 3);
  assert.equal(leave.getHours() * 60 + leave.getMinutes(), 9 * 60 + 53);
});

test('ics import handles weekly rules, folding and one-off events', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:abc',
    'SUMMARY:Pflanzenphysiologie',
    'LOCATION:H10 1.05',
    'DTSTART;TZID=Europe/Berlin:20261006T081500',
    'DTEND;TZID=Europe/Berlin:20261006T094500',
    'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270131T000000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Prüfung\\, Boden',
    ' kunde',
    'LOCATION:A6 0.01',
    'DTSTART:20261020T100000',
    'DTEND:20261020T120000',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const entries = parseIcs(ics);
  assert.equal(entries.length, 3);
  const [tue, thu, exam] = entries;
  assert.equal(tue.day, 2);
  assert.equal(thu.day, 4);
  assert.equal(tue.start, '08:15');
  assert.equal(tue.end, '09:45');
  assert.equal(tue.room, 'H10 1.05');
  assert.equal(tue.from, '2026-10-06');
  assert.equal(tue.until, '2027-01-31');
  assert.equal(exam.title, 'Prüfung, Bodenkunde');
  assert.equal(exam.date, '2026-10-20');
  assert.equal(eventsOn(entries, new Date(2026, 8, 29)).length, 0);
  assert.equal(eventsOn(entries, new Date(2026, 9, 13)).length, 1);
});

test('search finds rooms, legend services, canteens, stops and own classes', () => {
  const places = placesOf(ws);
  const classes = [{ id: '1', title: 'Statistik', room: 'H10 1.04', day: 1, start: '10:00', end: '11:30' }];
  const find = (q, i18n = de) => search(q, { campus: ws, places, classes, i18n });

  const room = find('a6 1.12')[0];
  assert.equal(room.type, 'room');
  assert.equal(room.placeId, 'A6');
  assert.equal(room.subtitle, 'Gebäude A6, 1. Obergeschoss');
  assert.equal(find('a6 1.12', en)[0].subtitle, 'Building A6, 1st floor');

  assert.equal(find('Bibliothek')[0].placeId, 'A8');
  assert.equal(find('library', en)[0].placeId, 'A8');
  assert.equal(find('studienberatung')[0].placeId, 'A6');
  assert.equal(find('international office')[0].placeId, 'C4');
  assert.equal(find('sprachenzentrum')[0].placeId, 'C4');
  assert.equal(find('forst')[0].placeId, 'F9');
  assert.equal(find('mensa')[0].placeId, 'mensa');
  assert.equal(find('h10')[0].placeId, 'H10');
  assert.equal(find('bahnhof')[0].title, 'Freising Bahnhof');
  assert.ok(find('weihenstephaner berg').some((r) => r.type === 'transit'));
  assert.ok(find('wohnheim').some((r) => r.type === 'residence'));

  const own = find('stat').find((r) => r.type === 'class');
  assert.equal(own.placeId, 'H10');
  assert.deepEqual(find('   '), []);
  assert.equal(normalize('Gewächshaus'), 'gewaechshaus');
});

test('i18n: language detection, interpolation, floors and countdowns', () => {
  assert.equal(detectLanguage(null, ['de-DE', 'en']), 'de');
  assert.equal(detectLanguage(null, ['en-US']), 'en');
  assert.equal(detectLanguage(null, ['fr-FR']), 'de');
  assert.equal(detectLanguage('en', ['de-DE']), 'en');

  assert.equal(de.t('route.summary', { min: 5, dist: '400 m' }), '5 Min. zu Fuß · 400 m');
  assert.equal(de.floor(0), 'Erdgeschoss');
  assert.equal(de.floor(2), '2. Obergeschoss');
  assert.equal(de.floor(-1), 'Untergeschoss');
  assert.equal(en.floor(3), '3rd floor');
  assert.equal(de.countdown(5 * 60000), 'in 5 Min.');
  assert.equal(en.countdown(90 * 60000), 'in 1 h 30 min');
  assert.equal(de.countdown(0), 'jetzt');
  assert.equal(de.weekday(1), 'Montag');
  assert.equal(en.weekday(5, true), 'Fri');
  assert.equal(de.distance(1234), '1,2 km');
  assert.equal(en.distance(347), '350 m');
});

test('every campus place has a position and name in both languages', () => {
  for (const campus of CAMPUSES) {
    for (const p of placesOf(campus)) {
      assert.equal(p.latlng.length, 2, p.id);
      assert.ok(de.pick(p.name) && en.pick(p.name), p.id);
    }
  }
});
