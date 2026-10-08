import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CAMPUSES, getCampus, placesOf } from '../js/data/campus.js';
import { parseRoomCode, locateRoom, floorLabel } from '../js/lib/rooms.js';
import { findRoute, buildGraph, nearestNode } from '../js/lib/routing.js';
import { openingStatus, describeStatus } from '../js/lib/hours.js';
import { nextEvent, eventsOn, leaveBy, parseIcs, formatCountdown } from '../js/lib/schedule.js';
import { search, normalize } from '../js/lib/search.js';

const ws = getCampus('weihenstephan');

test('room codes parse in common notations', () => {
  assert.deepEqual(parseRoomCode('D2.04'), { building: 'D', floor: 2, room: '04', code: 'D2.04' });
  assert.equal(parseRoomCode('b 0.01').code, 'B0.01');
  assert.equal(parseRoomCode('C-1.12').floor, -1);
  assert.equal(parseRoomCode('CU.12').floor, -1);
  assert.equal(parseRoomCode('A EG.3').code, 'A0.03');
  assert.equal(parseRoomCode('Mensa'), null);
  assert.equal(parseRoomCode(''), null);
});

test('rooms resolve to buildings and flag unknown floors', () => {
  assert.equal(locateRoom('D2.04', ws).buildingRef.id, 'D');
  assert.equal(locateRoom('E3.01', ws).floorKnown, false);
  assert.equal(locateRoom('Z1.01', ws), null);
  assert.equal(floorLabel(0), 'ground floor');
  assert.equal(floorLabel(2), '2nd floor');
  assert.equal(floorLabel(-1), 'basement');
});

test('every campus graph is valid and fully connected', () => {
  for (const campus of CAMPUSES) {
    const adj = buildGraph(campus);
    for (const place of placesOf(campus)) {
      assert.ok(campus.nodes[place.node], `${campus.id}/${place.id} has a node`);
    }
    const ids = Object.keys(campus.nodes);
    for (const id of ids) {
      assert.ok(findRoute(campus, ids[0], id), `${campus.id}: ${id} reachable`);
    }
    assert.ok(adj.size === ids.length);
  }
});

test('routing prefers stairs shortcut but can avoid stairs', () => {
  const withStairs = findRoute(ws, 'j2', 'j3');
  assert.deepEqual(withStairs.nodes, ['j2', 'j3']);
  assert.equal(withStairs.stairs, true);

  const stepFree = findRoute(ws, 'j2', 'j3', { avoidStairs: true });
  assert.equal(stepFree.stairs, false);
  assert.ok(stepFree.nodes.length > 2);
  assert.ok(stepFree.meters > withStairs.meters);
  assert.ok(stepFree.minutes >= 1);
});

test('routes to self are zero length', () => {
  const r = findRoute(ws, 'A', 'A');
  assert.deepEqual(r.nodes, ['A']);
  assert.equal(r.meters, 0);
});

test('nearest node snaps a GPS fix onto the graph', () => {
  assert.equal(nearestNode(ws, ws.nodes.mensa).id, 'mensa');
});

test('opening hours status', () => {
  const hours = { 1: [['11:00', '14:00']], 2: [['11:00', '14:00']] };
  const mon = (h, m) => new Date(2026, 9, 5, h, m); // Mon 5 Oct 2026
  assert.equal(mon(5, 0).getDay(), 1);

  assert.deepEqual(openingStatus(hours, mon(12, 0)), { known: true, open: true, closesAt: '14:00', closingSoon: false });
  assert.equal(openingStatus(hours, mon(13, 45)).closingSoon, true);
  assert.equal(describeStatus(openingStatus(hours, mon(9, 0))), 'Closed · opens today 11:00');
  assert.equal(describeStatus(openingStatus(hours, mon(15, 0))), 'Closed · opens tomorrow 11:00');
  assert.equal(describeStatus(openingStatus(hours, new Date(2026, 9, 7, 9))), 'Closed · opens Mon 11:00');
  assert.equal(openingStatus(undefined).known, false);
});

test('next class, today list and leave-by time', () => {
  const classes = [
    { id: '1', title: 'Botany', room: 'B0.01', day: 1, start: '08:15', end: '09:45' },
    { id: '2', title: 'Statistics', room: 'D2.04', day: 1, start: '10:00', end: '11:30' },
    { id: '3', title: 'Field trip', room: 'E0.01', date: '2026-10-07', start: '09:00', end: '12:00' },
  ];
  const mon = (h, m) => new Date(2026, 9, 5, h, m);

  assert.equal(eventsOn(classes, mon(0, 0)).length, 2);

  const during = nextEvent(classes, mon(8, 30));
  assert.equal(during.entry.title, 'Botany');
  assert.equal(during.ongoing, true);

  const between = nextEvent(classes, mon(9, 50));
  assert.equal(between.entry.title, 'Statistics');
  assert.equal(between.ongoing, false);

  const later = nextEvent(classes, mon(12, 0));
  assert.equal(later.entry.title, 'Field trip');

  assert.equal(nextEvent([], mon(12, 0)), null);

  const leave = leaveBy(between.startsAt, 4, 3);
  assert.equal(leave.getHours() * 60 + leave.getMinutes(), 9 * 60 + 53);

  assert.equal(formatCountdown(5 * 60000), 'in 5 min');
  assert.equal(formatCountdown(90 * 60000), 'in 1 h 30 min');
  assert.equal(formatCountdown(0), 'now');
});

test('ics import handles weekly rules, folding and one-off events', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:abc',
    'SUMMARY:Plant Physiology',
    'LOCATION:C1.05',
    'DTSTART;TZID=Europe/Berlin:20261006T081500',
    'DTEND;TZID=Europe/Berlin:20261006T094500',
    'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270131T000000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Exam\\, Soil',
    ' Science',
    'LOCATION:B0.01',
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
  assert.equal(tue.room, 'C1.05');
  assert.equal(tue.from, '2026-10-06');
  assert.equal(tue.until, '2027-01-31');
  assert.equal(exam.title, 'Exam, SoilScience');
  assert.equal(exam.date, '2026-10-20');

  // weekly class does not show before its first date
  assert.equal(eventsOn(entries, new Date(2026, 8, 29)).length, 0);
  assert.equal(eventsOn(entries, new Date(2026, 9, 13)).length, 1);
});

test('search finds rooms, aliases, services and own classes', () => {
  const places = placesOf(ws);
  const classes = [{ id: '1', title: 'Statistics', room: 'D2.04', day: 1, start: '10:00', end: '11:30' }];

  const room = search('d2.04', { campus: ws, places, classes })[0];
  assert.equal(room.type, 'room');
  assert.equal(room.placeId, 'D');

  assert.equal(search('Audimax', { campus: ws, places })[0].placeId, 'B');
  assert.equal(search('bibliothek', { campus: ws, places })[0].placeId, 'library');
  assert.equal(search('gewachshaus', { campus: ws, places })[0].placeId, 'E');

  const own = search('stat', { campus: ws, places, classes }).find((r) => r.type === 'class');
  assert.equal(own.placeId, 'D');

  assert.deepEqual(search('   ', { campus: ws, places }), []);
  assert.equal(normalize('Gewächshaus'), 'gewaechshaus');
});
