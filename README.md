# HSWT Navigator

For campus members who have no idea where they're heading, **HSWT Navigator** is a mobile/web app
that helps them find their way around the Weihenstephan campus of Hochschule Weihenstephan-Triesdorf.
Unlike Google Maps, it's built into daily campus life: it knows HSWT building codes and room numbers,
your timetable, today's Mensa menu and when to leave for your next class. The interface is in
**German and English**.

## Features

| | |
|---|---|
| **Real campus map** | All HSWT buildings from the official site plan (A1–A11, C4–C6, D1, F9/F10, H1–H21), residences, HSG, car parks and bus stops, drawn as real footprints on OpenStreetMap. |
| **Room search** | Type a room as printed on the door (`A6 1.12`, `H10.E.07`, `C4-1.03`, `D1 U.04`) or a plain building code. Searches services from the plan legend (*Studienberatung*, *Bibliothek*, *International Office*, *Sprachenzentrum*, dean's offices), canteens, stops and your own classes, in German or English. |
| **Real walking routes** | Turn-by-turn directions in German or English from FOSSGIS Valhalla, starting at your GPS position, Freising station or any building. Falls back to OSRM, then to an offline estimate. |
| **Step-free mode** | Requests Valhalla's wheelchair profile, which avoids stairs. |
| **Next class** | The *Heute/Today* tab shows your current or next class, room, floor, walking time and **when to leave**. *Navigieren* opens the route. |
| **Timetable import** | Import an `.ics` export (weekly `RRULE`s, one-off exams) or add classes by hand. Stays on the device. |
| **Mensa** | Opening status for Mensa Weihenstephan and both StuCafés, plus today's menu (prices, vegan/vegetarian labels) from the open eat-api. |
| **Deep links** | `?q=A6%201.12` opens a room directly, e.g. from a QR code on a door sign or a calendar invite. |
| **Installable & offline** | PWA: the app shell and map tiles you've seen keep working on patchy campus Wi-Fi. |

## Run it

No build step, no dependencies.

```bash
npm start        # serves on http://localhost:8080 (python3 -m http.server)
npm test         # unit tests with Node's built-in test runner (Node 18+)
```

## Where the data comes from

| Data | Source |
|---|---|
| Building codes, footprints, residences, HSG, car parks | Official HSWT *Lageplan Weihenstephan* (PDF), converted by `tools/build_campus_data.py` |
| Georeferencing of the plan | 72 plan buildings matched to the surveyed coordinates in [NavigaTUM](https://github.com/TUM-Dev/NavigaTUM) (TUM shares the hill). Median error **5.3 m**, RMS 8.6 m. Cross-checks: HSG 3 m, Freising station 3 m. |
| Bus stops | DELFI/MVV public-transport data (via NavigaTUM) |
| Canteen locations, hours, menus | Studierendenwerk München Oberbayern via [TUM-Dev eat-api](https://github.com/TUM-Dev/eat-api) |
| Base map | © OpenStreetMap contributors (`tile.openstreetmap.org`) |
| Walking routes | [FOSSGIS Valhalla](https://valhalla1.openstreetmap.de) and [FOSSGIS OSRM](https://routing.openstreetmap.de), on OpenStreetMap data |

All of these are free, need no API key and are the same services openstreetmap.org uses. They're
meant for light use, so for a large rollout, self-host Valhalla or switch the URLs in
`js/lib/directions.js` to a keyed provider.

### Updating the campus data

If HSWT publishes a new site plan:

```bash
pip install pymupdf numpy shapely pandas pyarrow
git clone --depth 1 --filter=blob:limit=5m --sparse https://github.com/TUM-Dev/NavigaTUM
(cd NavigaTUM && git sparse-checkout set data/external/results)
python3 tools/build_campus_data.py lageplan-weihenstephan.pdf NavigaTUM/data/external/results
npm test
```

The script prints the georeferencing quality. Footprints that share one polygon or have no code on
the plan are handled in `LABEL_OVERRIDES` / `MARKER_OVERRIDES` at the top of the script. Text
from the plan's legend (dean's offices, services) and the canteens lives in `js/data/campus.js`.

## Project layout

```
index.html                         App shell (Karte / Heute / Campus)
css/styles.css                     Mobile-first styles, dark mode
js/app.js                          UI controller
js/data/campus.js                  Legend info, canteens, places
js/data/weihenstephan.generated.js Georeferenced plan data (generated)
js/lib/i18n.js                     German/English strings and formatting
js/lib/rooms.js                    Room-code parsing ("A6 1.12" → A6, 1st floor)
js/lib/directions.js               Valhalla / OSRM client with fallbacks
js/lib/mensa.js                    eat-api menu URLs and parsing
js/lib/routing.js                  Distances and walking-time estimates
js/lib/schedule.js                 Next class, leave-by time, .ics import
js/lib/hours.js                    Opening-hours status
js/lib/search.js                   Ranked, umlaut-tolerant search
tools/build_campus_data.py         Site plan → georeferenced JS data
sw.js                              Offline caching
tests/                             Unit tests
```

## Known limits

- The plan has no room numbers and no floor plans, so a room resolves to its building and floor
  but routes end at the building, not at the door.
- Step-free routing is only as good as OpenStreetMap's tagging of steps and kerbs on campus.
- Only the Weihenstephan campus is mapped. The data model supports more campuses (the header shows
  a campus switcher once a second one is added). Triesdorf needs its own site plan.
- The plan has no names for some smaller HSWT buildings (light green on the map) and for some
  gastronomy symbols, so they are shown but not searchable.
