import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodePolyline,
  valhallaRequestUrl,
  parseValhalla,
  osrmRequestUrl,
  parseOsrm,
  getDirections,
} from '../js/lib/directions.js';
import { readFileSync } from 'node:fs';
import { isoWeek, menuUrl, menuWeekStart, dishesOn, daysOf, parseDish, formatPrice, matchesDiet, conflicts, groupByType } from '../js/lib/mensa.js';
import { createI18n } from '../js/lib/i18n.js';

const A = [48.3955, 11.7302];
const B = [48.4021, 11.7302];

test('polyline decoding (Google reference example, precision 5)', () => {
  const coords = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
  assert.deepEqual(coords, [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]);
});

test('Valhalla request uses pedestrian costing, wheelchair for step-free, localized directions', () => {
  const plain = JSON.parse(decodeURIComponent(valhallaRequestUrl(A, B, { lang: 'de' }).split('json=')[1]));
  assert.equal(plain.costing, 'pedestrian');
  assert.deepEqual(plain.costing_options.pedestrian, {});
  assert.equal(plain.directions_options.language, 'de-DE');
  assert.deepEqual(plain.locations[0], { lat: A[0], lon: A[1] });

  const stepFree = JSON.parse(decodeURIComponent(valhallaRequestUrl(A, B, { stepFree: true, lang: 'en' }).split('json=')[1]));
  assert.equal(stepFree.costing_options.pedestrian.type, 'wheelchair');
  assert.equal(stepFree.directions_options.language, 'en-US');
});

const valhallaFixture = {
  trip: {
    summary: { length: 0.812, time: 610 },
    legs: [
      {
        shape: '_p~iF~ps|U_ulLnnqC',
        maneuvers: [
          { instruction: 'Gehen Sie nach Norden auf Am Hofgarten.', length: 0.2 },
          { instruction: 'Biegen Sie rechts ab auf Vöttinger Straße.', length: 0.612 },
          { instruction: 'Sie haben Ihr Ziel erreicht.', length: 0 },
        ],
      },
    ],
  },
};

test('Valhalla response parsing', () => {
  const r = parseValhalla(valhallaFixture);
  assert.equal(r.meters, 812);
  assert.equal(r.minutes, 10);
  assert.equal(r.steps.length, 3);
  assert.equal(r.steps[1].meters, 612);
  assert.equal(r.coords.length, 2);
  assert.equal(parseValhalla({}), null);
});

const osrmFixture = {
  code: 'Ok',
  routes: [{ distance: 950, geometry: { coordinates: [[11.7302, 48.3955], [11.7302, 48.4021]] } }],
};

test('OSRM request and response parsing', () => {
  assert.match(osrmRequestUrl(A, B), /routed-foot\/route\/v1\/driving\/11\.7302,48\.3955;11\.7302,48\.4021\?/);
  const r = parseOsrm(osrmFixture);
  assert.deepEqual(r.coords[0], A);
  assert.equal(r.meters, 950);
  assert.equal(r.minutes, 12);
  assert.equal(parseOsrm({ code: 'NoRoute', routes: [] }), null);
});

const reply = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });

test('directions fall back from Valhalla to OSRM to an offline estimate', async () => {
  const calls = [];
  const valhallaOk = (url) => (calls.push(url), reply(valhallaFixture));
  assert.equal((await getDirections(A, B, {}, valhallaOk)).provider, 'Valhalla (FOSSGIS)');
  assert.equal(calls.length, 1);

  const valhallaDown = (url) => (url.includes('valhalla') ? reply({}, false) : reply(osrmFixture));
  const osrm = await getDirections(A, B, { stepFree: true }, valhallaDown);
  assert.equal(osrm.provider, 'OSRM (FOSSGIS)');
  assert.equal(osrm.noStepFree, true);

  const offline = () => Promise.reject(new Error('offline'));
  const est = await getDirections(A, B, {}, offline);
  assert.equal(est.approx, true);
  assert.equal(est.provider, null);
  assert.ok(est.meters > 700);
});

test('Mensa: ISO weeks, eat-api URLs and the weekend rollover', () => {
  assert.deepEqual(isoWeek(new Date(2026, 9, 8)), { year: 2026, week: 41 });
  assert.deepEqual(isoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek(new Date(2026, 0, 5)), { year: 2026, week: 2 });
  assert.equal(
    menuUrl('mensa-weihenstephan', new Date(2026, 0, 5)),
    'https://tum-dev.github.io/eat-api/mensa-weihenstephan/2026/02.json',
  );
  assert.equal(menuWeekStart(new Date(2026, 9, 8)).getDate(), 5); // Thu → Monday of the same week
  assert.equal(menuWeekStart(new Date(2026, 9, 10)).getDate(), 12); // Sat → next Monday
  assert.equal(menuWeekStart(new Date(2026, 9, 11)).getDate(), 12); // Sun → next Monday
});

// A real week of Mensa Weihenstephan (eat-api, ISO week 41/2026).
const week = JSON.parse(readFileSync(new URL('./fixtures/mensa-weihenstephan-2026-41.json', import.meta.url)));

test('Mensa: real eat-api week parses into detailed dishes', () => {
  const days = daysOf(week);
  assert.ok(days.length >= 3);
  const dishes = dishesOn(week, '2026-10-08');
  assert.ok(dishes.length >= 5);

  const spaetzle = dishes.find((d) => d.name.startsWith('Allgäuer Käsespätzle'));
  assert.equal(spaetzle.diet, 'vegetarian');
  assert.deepEqual(spaetzle.allergenFamilies.sort(), ['eggs', 'gluten', 'milk']);
  assert.equal(formatPrice(spaetzle.prices.students), '3,35\u00a0€');
  assert.equal(formatPrice(spaetzle.prices.guests, 'en-GB'), '€5.90');

  const koefte = dishes.find((d) => d.name.startsWith('Köfte'));
  assert.equal(koefte.diet, 'meat');
  assert.deepEqual(koefte.meat, ['BEEF']);

  const curry = dishes.find((d) => d.name.startsWith('Massaman'));
  assert.equal(curry.diet, 'vegan');
  assert.ok(curry.allergenFamilies.includes('peanuts'));
  assert.deepEqual(conflicts(curry, ['peanuts', 'fish']), ['peanuts']);

  assert.equal(dishes.filter((d) => matchesDiet(d, 'vegan')).every((d) => d.diet === 'vegan'), true);
  assert.ok(dishes.filter((d) => matchesDiet(d, 'vegetarian')).length > dishes.filter((d) => matchesDiet(d, 'vegan')).length);
  assert.ok(!dishes.filter((d) => matchesDiet(d, 'nopork')).some((d) => d.meat.includes('PORK')));

  const groups = groupByType(dishes);
  assert.equal(groups[0].type, 'StudiTopf');
  assert.deepEqual(dishesOn(week, '2026-10-11'), []);
  assert.deepEqual(dishesOn(null, '2026-10-11'), []);
});

test('Mensa: prices per unit and missing prices', () => {
  assert.equal(formatPrice({ base_price: 0, price_per_unit: 0.9, unit: '100g' }), '0,90\u00a0€/100g');
  assert.equal(formatPrice({ base_price: 1.5, price_per_unit: 0.9, unit: '100g' }), '1,50\u00a0€ + 0,90\u00a0€/100g');
  assert.equal(formatPrice(undefined), '');
  const d = parseDish({ name: 'X', labels: ['UNKNOWN_LABEL', 'VEGAN', 'VEGETARIAN', 'SULFITES', 'DYESTUFF', 'MSC'] });
  assert.deepEqual([d.diet, d.allergens, d.additives, d.quality], ['vegan', ['SULFITES'], ['DYESTUFF'], ['MSC']]);
});

test('German and English dictionaries have the same keys', async () => {
  const de = createI18n('de');
  const en = createI18n('en');
  const probe = ['tab.map', 'route.go', 'today.leaveBy', 'mensa.allergens', 'settings.language', 'about.data'];
  for (const key of probe) {
    assert.notEqual(de.t(key), key);
    assert.notEqual(en.t(key), key);
    assert.notEqual(de.t(key), en.t(key));
  }
});
