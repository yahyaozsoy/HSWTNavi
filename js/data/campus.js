// Campus seed data for HSWT Navigator.
//
// NOTE: Coordinates, building letters and opening hours below are SEED DATA
// for development. Verify them against the official HSWT site plans before a
// public release. All map content lives in this file so it can be edited (or
// later generated from facility management exports) without touching app code.
//
// Model
//   nodes:     walkable graph vertices  { id: [lat, lng] }
//   edges:     [from, to, { stairs?: true }]  – weights are computed from distance
//   buildings: places with rooms; `node` is the entrance used for routing
//   pois:      services (food, library, transit, ...) with optional weekly hours
//
// Hours format: { <weekday 0=Sun..6=Sat>: [["HH:MM", "HH:MM"], ...] }

const WEEKDAYS = (ranges) => ({ 1: ranges, 2: ranges, 3: ranges, 4: ranges, 5: ranges });

export const CAMPUSES = [
  {
    id: 'weihenstephan',
    name: 'Weihenstephan',
    city: 'Freising',
    entrance: 'gate', // where off-campus routes start
    center: [48.3958, 11.7266],
    zoom: 17,
    nodes: {
      gate: [48.3945, 11.7246],
      j1: [48.395, 11.7255],
      j2: [48.3956, 11.7262],
      j3: [48.3962, 11.727],
      j4: [48.3958, 11.728],
      j5: [48.3965, 11.7258],
      j6: [48.3952, 11.7272],
      A: [48.3951, 11.7259],
      B: [48.3959, 11.7256],
      C: [48.3965, 11.7267],
      D: [48.396, 11.7275],
      E: [48.395, 11.7277],
      L: [48.3967, 11.7262],
      mensa: [48.3956, 11.7285],
      cafe: [48.3955, 11.7264],
      bike: [48.3947, 11.725],
    },
    edges: [
      ['gate', 'bike'],
      ['bike', 'j1'],
      ['j1', 'A'],
      ['j1', 'j2'],
      ['j2', 'cafe'],
      ['j2', 'B'],
      ['j2', 'j5'],
      ['j5', 'B'],
      ['j5', 'L'],
      ['j5', 'C'],
      ['j2', 'j3', { stairs: true }], // short-cut staircase up the hill
      ['j2', 'j6'],
      ['j6', 'E'],
      ['j6', 'j4'],
      ['j4', 'mensa'],
      ['j4', 'D'],
      ['j4', 'j3'],
      ['j3', 'D'],
      ['j3', 'C'],
    ],
    buildings: [
      {
        id: 'A',
        name: 'Building A',
        description: 'Main building – administration, Student Service Center, IT help desk',
        aliases: ['Hauptgebäude', 'Verwaltung', 'Studienbüro', 'Student Office', 'IT'],
        node: 'A',
        floors: [0, 1, 2],
        accessible: true,
      },
      {
        id: 'B',
        name: 'Building B',
        description: 'Lecture halls B0.01 (Audimax) – B0.04',
        aliases: ['Hörsaalgebäude', 'Audimax', 'Lecture hall'],
        node: 'B',
        floors: [0, 1],
        accessible: true,
      },
      {
        id: 'C',
        name: 'Building C',
        description: 'Laboratories and seminar rooms',
        aliases: ['Labor', 'Labs'],
        node: 'C',
        floors: [-1, 0, 1, 2],
        accessible: true,
      },
      {
        id: 'D',
        name: 'Building D',
        description: 'Seminar rooms, faculty offices, PC pools',
        aliases: ['PC-Pool', 'Seminar', 'Fakultät'],
        node: 'D',
        floors: [0, 1, 2, 3],
        accessible: false,
      },
      {
        id: 'E',
        name: 'Building E',
        description: 'Horticulture, greenhouses and teaching gardens',
        aliases: ['Gewächshaus', 'Greenhouse', 'Gartenbau'],
        node: 'E',
        floors: [0],
        accessible: true,
      },
    ],
    pois: [
      {
        id: 'mensa',
        name: 'Mensa',
        category: 'food',
        description: 'Cafeteria run by the Studierendenwerk',
        aliases: ['Canteen', 'Essen', 'Lunch'],
        node: 'mensa',
        hours: WEEKDAYS([['11:00', '14:00']]),
      },
      {
        id: 'cafe',
        name: 'Cafeteria / StuCafé',
        category: 'food',
        description: 'Coffee, snacks, microwaves',
        aliases: ['Kaffee', 'Coffee', 'Snacks'],
        node: 'cafe',
        hours: { ...WEEKDAYS([['07:45', '16:00']]), 5: [['07:45', '14:00']] },
      },
      {
        id: 'library',
        name: 'Library',
        category: 'study',
        description: 'Quiet study spaces, group rooms, printing',
        aliases: ['Bibliothek', 'Bib', 'Print', 'Drucken'],
        node: 'L',
        hours: { ...WEEKDAYS([['08:00', '22:00']]), 6: [['09:00', '18:00']] },
      },
      {
        id: 'bus',
        name: 'Bus stop Weihenstephan',
        category: 'transit',
        description: 'Buses to Freising station',
        aliases: ['Bus', 'Haltestelle', 'Bahnhof'],
        node: 'gate',
      },
      {
        id: 'bikes',
        name: 'Bike parking',
        category: 'transit',
        description: 'Covered bike racks',
        aliases: ['Fahrrad', 'Bike'],
        node: 'bike',
      },
    ],
  },
  {
    id: 'triesdorf',
    name: 'Triesdorf',
    city: 'Weidenbach',
    entrance: 'station',
    center: [49.1985, 10.6528],
    zoom: 17,
    nodes: {
      station: [49.1999, 10.6512],
      t1: [49.1992, 10.6519],
      t2: [49.1986, 10.6527],
      t3: [49.198, 10.6535],
      t4: [49.1988, 10.6538],
      M: [49.1984, 10.6522],
      H: [49.1989, 10.6531],
      G: [49.1978, 10.654],
      mensa: [49.1991, 10.6542],
      L: [49.1982, 10.6529],
    },
    edges: [
      ['station', 't1'],
      ['t1', 't2'],
      ['t2', 'M'],
      ['t2', 'H'],
      ['t2', 't3'],
      ['t3', 'L'],
      ['t3', 'G'],
      ['t2', 't4'],
      ['t4', 'H'],
      ['t4', 'mensa'],
      ['t4', 't3', { stairs: true }],
    ],
    buildings: [
      {
        id: 'M',
        name: 'Markgrafenschloss',
        description: 'Administration and Student Service Center Triesdorf',
        aliases: ['Schloss', 'Verwaltung', 'Student Office'],
        node: 'M',
        floors: [0, 1, 2],
        accessible: false,
      },
      {
        id: 'H',
        name: 'Hörsaalzentrum',
        description: 'Lecture halls and seminar rooms',
        aliases: ['Lecture hall', 'Hörsaal'],
        node: 'H',
        floors: [0, 1],
        accessible: true,
      },
      {
        id: 'G',
        name: 'Agricultural labs',
        description: 'Laboratories for agriculture and food technology',
        aliases: ['Labor', 'Labs', 'Landwirtschaft'],
        node: 'G',
        floors: [0, 1],
        accessible: true,
      },
    ],
    pois: [
      {
        id: 'mensa-t',
        name: 'Mensa Triesdorf',
        category: 'food',
        description: 'Cafeteria run by the Studierendenwerk',
        aliases: ['Canteen', 'Essen', 'Lunch'],
        node: 'mensa',
        hours: WEEKDAYS([['11:15', '13:45']]),
      },
      {
        id: 'library-t',
        name: 'Library Triesdorf',
        category: 'study',
        description: 'Study spaces and printing',
        aliases: ['Bibliothek', 'Bib', 'Print'],
        node: 'L',
        hours: WEEKDAYS([['08:00', '18:00']]),
      },
      {
        id: 'station-t',
        name: 'Triesdorf station',
        category: 'transit',
        description: 'Regional trains to Ansbach and Gunzenhausen',
        aliases: ['Bahnhof', 'Train', 'Zug'],
        node: 'station',
      },
    ],
  },
];

export function getCampus(id) {
  return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

// Every building and POI as one list of navigable places.
export function placesOf(campus) {
  return [
    ...campus.buildings.map((b) => ({ ...b, kind: 'building', category: 'building' })),
    ...campus.pois.map((p) => ({ ...p, kind: 'poi' })),
  ].map((p) => ({ ...p, latlng: campus.nodes[p.node] }));
}
