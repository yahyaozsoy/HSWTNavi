// Campus data for HSWT Navigator.
//
// Geometry (building footprints, positions, bus stops, car parks) is generated from the official
// HSWT site plan by tools/build_campus_data.py – see weihenstephan.generated.js.
// This file adds what a person knows from the plan's legend and other sources: what is where.
//
// Hours format: { <weekday 0=Sun..6=Sat>: [["HH:MM", "HH:MM"], ...] }

import geo from './weihenstephan.generated.js';

const weekdays = (open, close, friClose = close) => ({
  1: [[open, close]],
  2: [[open, close]],
  3: [[open, close]],
  4: [[open, close]],
  5: [[open, friClose]],
});

// From the plan's legend ("Dekanate", "Einrichtungen und Services") and NavigaTUM.
const BUILDING_INFO = {
  A3: {
    description: { de: 'Dekanat Bioingenieurwissenschaften', en: "Dean's office Bioengineering Sciences" },
    aliases: ['Bioingenieurwissenschaften', 'Bioengineering', 'Dekanat'],
  },
  A5: {
    description: { de: 'Dekanat Landschaftsarchitektur', en: "Dean's office Landscape Architecture" },
    aliases: ['Landschaftsarchitektur', 'Landscape Architecture', 'Dekanat'],
  },
  A6: {
    description: {
      de: 'Allgemeine Studienberatung · Student.Service',
      en: 'General student advisory service · Student.Service',
    },
    aliases: ['Studienberatung', 'Student Service', 'Studierendenservice', 'Student Office', 'Studienbüro', 'Beratung'],
  },
  A8: {
    description: { de: 'Bibliothek', en: 'Library' },
    aliases: ['Bibliothek', 'Library', 'Bib', 'Lernen', 'Study'],
  },
  A9: {
    description: { de: 'Kustermannhalle', en: 'Kustermannhalle' },
    aliases: ['Kustermannhalle', 'Halle'],
  },
  C4: {
    description: {
      de: 'International Office · Career Center · Sprachenzentrum',
      en: 'International Office · Career Center · Language Centre',
    },
    aliases: ['International Office', 'Career Center', 'Sprachenzentrum', 'Language Centre', 'Erasmus', 'Auslandsamt'],
  },
  D1: {
    description: { de: 'Dekanat Nachhaltige Agrar- und Energiesysteme', en: "Dean's office Sustainable Agriculture and Energy Systems" },
    aliases: ['Agrar', 'Energiesysteme', 'Agriculture', 'Energy', 'Dekanat'],
  },
  F9: {
    description: { de: 'Dekanat Wald und Forstwirtschaft', en: "Dean's office Forestry" },
    aliases: ['Wald', 'Forstwirtschaft', 'Forestry', 'Forst', 'Dekanat'],
  },
  H10: {
    description: { de: 'Dekanat Gartenbau und Lebensmitteltechnologie', en: "Dean's office Horticulture and Food Technology" },
    aliases: ['Gartenbau', 'Lebensmitteltechnologie', 'Horticulture', 'Food Technology', 'Dekanat'],
  },
};

const sortCode = (a, b) => a.localeCompare(b, 'en', { numeric: true });

const buildings = Object.keys(geo.buildings)
  .sort(sortCode)
  .map((id) => ({
    id,
    kind: 'building',
    name: { de: `Gebäude ${id}`, en: `Building ${id}` },
    description: BUILDING_INFO[id]?.description ?? null,
    aliases: BUILDING_INFO[id]?.aliases ?? [],
    latlng: geo.buildings[id].latlng,
    footprints: geo.buildings[id].footprints,
  }));

// Canteens: locations and hours from TUM-Dev eat-api (src/entities.py), menus fetched live.
const canteens = [
  {
    id: 'mensa',
    kind: 'food',
    name: 'Mensa Weihenstephan',
    description: { de: 'Maximus-von-Imhof-Forum 5 · Studierendenwerk', en: 'Maximus-von-Imhof-Forum 5 · Studierendenwerk' },
    aliases: ['Mensa', 'Canteen', 'Essen', 'Mittagessen', 'Lunch'],
    latlng: [48.39959, 11.723147],
    hours: weekdays('11:00', '13:30'),
    menu: 'mensa-weihenstephan',
  },
  {
    id: 'stucafe-maximus',
    kind: 'food',
    name: 'StuCafé Weihenstephan-Maximus',
    description: { de: 'Kaffee & Snacks · Maximus-von-Imhof-Forum 5', en: 'Coffee & snacks · Maximus-von-Imhof-Forum 5' },
    aliases: ['Café', 'Cafe', 'Kaffee', 'Coffee', 'StuCafé'],
    latlng: [48.399751, 11.723394],
    hours: weekdays('08:30', '15:00', '14:00'),
  },
  {
    id: 'stucafe-akademie',
    kind: 'food',
    name: 'StuCafé Akademie Weihenstephan',
    description: { de: 'Kaffee & Snacks · Alte Akademie 1', en: 'Coffee & snacks · Alte Akademie 1' },
    aliases: ['Café', 'Cafe', 'Kaffee', 'Coffee', 'StuCafé', 'Akademie'],
    latlng: [48.3948, 11.729338],
    hours: weekdays('08:00', '14:30', '14:00'),
  },
];

const ROMAN = { 'WH I': 1, 'WH II': 2, 'WH III': 3, 'WH IV': 4 };
const residences = Object.entries(geo.residences).map(([code, r]) => ({
  id: code.replace(' ', ''),
  kind: 'residence',
  name: { de: `Wohnheim ${code.slice(3)}`, en: `Residence hall ${code.slice(3)}` },
  description: { de: 'Studierendenwohnheim', en: 'Student residence' },
  aliases: ['Wohnheim', 'WH', 'Residence', 'Dorm', code],
  latlng: r.latlng,
  footprints: r.footprints,
  order: ROMAN[code],
}));

const services = [
  {
    id: 'hsg',
    kind: 'service',
    name: { de: 'Hochschulgemeinde (HSG)', en: 'University chaplaincy (HSG)' },
    description: { de: 'Hochschulgemeinde Freising', en: 'Hochschulgemeinde Freising' },
    aliases: ['HSG', 'Hochschulgemeinde', 'KHG', 'ESG'],
    latlng: geo.hsg.latlng,
    footprints: geo.hsg.footprints,
  },
];

const stops = geo.stops.map((s, i) => ({
  id: `stop-${i}`,
  kind: 'transit',
  name: s.name === 'Freising' ? 'Freising Bahnhof' : s.name,
  description: s.modes.includes('regional_rail')
    ? { de: 'S-Bahn, Regionalzüge, Busse', en: 'S-Bahn, regional trains, buses' }
    : { de: 'Bushaltestelle', en: 'Bus stop' },
  aliases: ['Bus', 'Haltestelle', 'Stop', ...(s.modes.includes('regional_rail') ? ['Bahnhof', 'Station', 'S-Bahn', 'Zug', 'Train'] : [])],
  latlng: s.latlng,
}));

export const CAMPUSES = [
  {
    id: 'weihenstephan',
    name: 'Weihenstephan',
    city: 'Freising',
    center: [48.3985, 11.7265],
    zoom: 16,
    station: stops.find((s) => s.name === 'Freising Bahnhof')?.latlng ?? [48.395252, 11.744187],
    georeference: geo.georeference,
    buildings,
    pois: [...canteens, ...services, ...residences.sort((a, b) => a.order - b.order), ...stops],
    unlabeledFootprints: geo.unlabeledFootprints,
    parking: geo.parking,
  },
];

export function getCampus(id) {
  return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

// Every building and POI as one list of navigable places.
export function placesOf(campus) {
  return [...campus.buildings, ...campus.pois];
}
