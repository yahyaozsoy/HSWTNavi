# HSWT Navigator

For campus members who have no idea where they're heading, **HSWT Navigator** is a mobile/web app
that helps them find their way around the Weihenstephan campus of Hochschule Weihenstephan-Triesdorf.
Unlike Google Maps, it's built into daily campus life: it knows HSWT building codes and room numbers,
your timetable, today's Mensa menu and when to leave for your next class. The interface is in
**German and English**.

## Features

| | |
|---|---|
| **Accurate campus map** | All HSWT buildings (A1–A11, C4–C6, D1, F9/F10, H1–H21 incl. H3, H12) drawn with their real OpenStreetMap outlines, matched to the codes on the official HSWT site plan. Also residences, HSG, car parks and bus stops. |
| **Rooms & offices** | Type a room as HSWT writes it (`A6.301`, `D1.436`, `h10 215`), a professor's name (*Laube*, *Martens*) or an office (*Student.Service*, *Immatrikulation*, *Career Service*). Each result has a walking route, address and link to the hswt.de page. |
| **Professors' offices** | 50 professors' offices from their hswt.de profile pages, grouped by faculty, each linking to the profile for office hours. You can add anyone else yourself (*Campus → My contacts*), and they then show up in search. |
| **Where to go for help** | Student.Service, student advisory service, library, International Office, Career Service, Language Centre and the dean's offices, with room, live opening status, weekly hours, phone and email. |
| **Study late** | The TUM branch library next to the Mensa (Mon–Fri until midnight, weekends 10–20) with live open/closed status. |
| **Detailed Mensa menu** | Whole week with day tabs, dishes grouped by counter, prices for students, staff or guests, diet badges, and allergens and additives per dish. Filters for vegetarian, vegan and no pork, plus *my allergens*, which flags or hides dishes containing them (all 14 EU allergens). |
| **Real walking routes** | Turn-by-turn directions in German or English from FOSSGIS Valhalla, starting at your GPS position, Freising station or any building. Falls back to OSRM, then to an offline estimate. Step-free mode uses Valhalla's wheelchair profile. |
| **Next class** | *Heute/Today* shows your next class, its room and building, the walking time and **when to leave**, plus a lunch tip from today's Mensa menu. |
| **Easy to use** | Quick buttons (Mensa, library, Student.Service, café, station, professors), saved places, recent searches, sharing links, a short welcome tour, and a side-panel layout on tablets. |
| **Timetable import** | `.ics` export (weekly `RRULE`s, one-off exams) or manual entry. Stays on the device. |
| **Deep links** | `?q=A6.301` or `?q=Laube` opens a room or person directly, e.g. from a QR code on a door sign. |
| **German & English** | Follows the browser language. Switch in the header. |
| **Dark mode** | Follows the system or can be set by hand (🌙/☀️ in the header, or *Campus → Settings*). The map tiles are darkened too. |
| **Installable & offline** | PWA: the app shell and the map tiles you've already viewed keep working on patchy campus Wi-Fi. |

## Run it

No build step, no dependencies.

```bash
npm start        # serves on http://localhost:8080 (python3 -m http.server)
npm test         # unit tests with Node's built-in test runner (Node 18+)
```

## Where the data comes from

| Data | Source |
|---|---|
| Building outlines | © OpenStreetMap contributors, via the [Overture Maps](https://overturemaps.org) buildings theme. 27 HSWT buildings are named with their code in OSM. C4 and C6 are matched by overlap. F10 keeps its site-plan position. |
| Building codes, residences, HSG, car parks | Official HSWT *Lageplan Weihenstephan* (PDF), georeferenced against [NavigaTUM](https://github.com/TUM-Dev/NavigaTUM)'s surveyed building coordinates (72 matches, median 5 m), then locally corrected with the OSM matches |
| Offices, rooms, hours, addresses, professors | Public pages on www.hswt.de (collected 8 Oct 2026, source link per entry in `js/data/hswt.js`) |
| Bus stops | DELFI/MVV public-transport data (via NavigaTUM) |
| Canteens, hours, menus, allergens | Studierendenwerk München Oberbayern via [TUM-Dev eat-api](https://github.com/TUM-Dev/eat-api) |
| TUM branch library hours | [ub.tum.de](https://www.ub.tum.de/en/branch-library-weihenstephan) (via NavigaTUM, Aug 2026) |
| Base map | © OpenStreetMap contributors (`tile.openstreetmap.org`) |
| Walking routes | [FOSSGIS Valhalla](https://valhalla1.openstreetmap.de) and [FOSSGIS OSRM](https://routing.openstreetmap.de), on OpenStreetMap data |

All of these are free and need no API key. Routing and tiles are meant for light use, so for a large rollout, self-host Valhalla or switch the URLs in `js/lib/directions.js` to a keyed provider.

### Updating the data

- **Offices, people, hours:** edit `js/data/hswt.js`. Each entry links to its hswt.de source page.
- **Buildings**, when HSWT publishes a new site plan or OSM changes:

```bash
pip install pymupdf numpy shapely pandas pyarrow
git clone --depth 1 --filter=blob:limit=5m --sparse https://github.com/TUM-Dev/NavigaTUM
(cd NavigaTUM && git sparse-checkout set data/external/results)
python3 tools/fetch_overture_buildings.py overture-buildings.parquet     # only the campus area, via HTTP range requests
python3 tools/build_campus_data.py lageplan-weihenstephan.pdf NavigaTUM/data/external/results overture-buildings.parquet
npm test
```

The script prints the georeferencing quality and lists which buildings came from OSM, which were matched by overlap and which kept their plan position.
## Project layout

```
index.html                         App shell (Karte / Heute / Campus)
css/styles.css                     Mobile-first styles, dark mode
js/app.js                          UI controller
js/data/campus.js                  Places: buildings, offices, canteens, people
js/data/hswt.js                    Offices, professors, addresses from hswt.de
js/data/mensa-labels.js            eat-api dish labels (allergens, additives, diet)
js/data/weihenstephan.generated.js Building footprints & positions (generated)
js/lib/i18n.js                     German/English strings and formatting
js/lib/rooms.js                    HSWT room numbers ("A6.301" → building A6)
js/lib/directions.js               Valhalla / OSRM client with fallbacks
js/lib/mensa.js                    Menus: parsing, prices, diet & allergen filters
js/lib/routing.js                  Distances and walking-time estimates
js/lib/schedule.js                 Next class, leave-by time, .ics import
js/lib/hours.js                    Opening-hours status
js/lib/search.js                   Ranked, umlaut-tolerant search
tools/build_campus_data.py         Site plan → georeferenced JS data
tools/osm_refine.py                Snap plan buildings to OpenStreetMap footprints
tools/fetch_overture_buildings.py  Download campus building outlines from Overture
sw.js                              Offline caching
tests/                             Unit tests
```

## Known limits

- There are no indoor floor plans, so routes end at the building, not at the room. HSWT room numbers don't reliably encode the floor, so the app doesn't guess one.
- The professor list covers the 50 Weihenstephan offices published on hswt.de profile pages that could be collected. Everyone else can be added under *My contacts* (with a link to the HSWT person directory).
- Office hours and Mensa data change. Each office links to its source page, and the menu shows the Studierendenwerk's own data, which comes without guarantee.
- Step-free routing is only as good as OpenStreetMap's tagging of steps and kerbs on campus.
- Only the Weihenstephan campus is mapped. Triesdorf needs its own site plan.
