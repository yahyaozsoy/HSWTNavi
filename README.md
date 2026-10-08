# HSWT Navigator

For campus members who have no idea where they're heading, **HSWT Navigator** is a mobile/web app
that helps them find their way around the campuses of Hochschule Weihenstephan-Triesdorf.
Unlike Google Maps, it's built into daily campus life: it knows your timetable, room codes,
step-free paths and when the Mensa closes.

## Features

| | |
|---|---|
| **Room search** | Type a room code the way it's printed on the door (`D2.04`, `B 0.01`, `C-1.12`, `AEG.3`) and see the building and floor. Also searches buildings, services, German/English aliases (*Bibliothek*, *Gewächshaus*, *Audimax*) and your own classes. |
| **Next class** | The *Today* tab shows your current or next class, which room it's in, how long the walk is and **when to leave**. Tap *Navigate* to get the route. |
| **Timetable import** | Import an `.ics` export (weekly `RRULE`s, one-off events like exams) or add classes by hand. All data stays on the device (`localStorage`). |
| **Campus routing** | Walking routes on a campus path graph, starting from your GPS position (snapped to the nearest path) or any building. |
| **Step-free mode** | Routes that avoid stairs, plus warnings for buildings whose upper floors aren't step-free. |
| **Open now** | Live opening status for the Mensa, cafeteria and library ("Open · closes 14:00", "Closed · opens Mon 11:00"). |
| **Multi-campus** | Weihenstephan (Freising) and Triesdorf, switchable in the header. |
| **Deep links** | `?q=D2.04` opens a room directly, e.g. from a QR code on a door sign or a link in a calendar invite. |
| **Installable & offline** | PWA with a service worker; the app shell and map tiles you've already viewed keep working on patchy campus Wi-Fi. |

## Run it

No build step and no dependencies. Leaflet and OpenStreetMap tiles load from a CDN.

```bash
npm start        # serves on http://localhost:8080 (python3 -m http.server)
npm test         # unit tests with Node's built-in test runner (Node 18+)
```

Open the site on a phone and choose *Add to Home Screen* to install it.

## Project layout

```
index.html              App shell (Map / Today / Campus tabs)
css/styles.css          Mobile-first styles, dark mode
js/app.js               UI controller (map, search, sheet, timetable, settings)
js/data/campus.js       Campus data: path graph, buildings, services, opening hours
js/lib/rooms.js         Room-code parsing ("D2.04" → building D, 2nd floor)
js/lib/routing.js       Distance, Dijkstra routing, stairs avoidance, walk times
js/lib/schedule.js      Next class, leave-by time, .ics import
js/lib/hours.js         Opening-hours status
js/lib/search.js        Ranked search with umlaut-tolerant matching
sw.js                   Offline caching
tests/core.test.mjs     Unit tests for all of js/lib and the campus data
```

## Campus data

All map content is in [`js/data/campus.js`](js/data/campus.js). **The current coordinates, building
letters and opening hours are seed data** used for development. Check them against the official HSWT
site plans before a public release. To add a building:

1. Add an entrance node to `nodes` (`id: [lat, lng]`).
2. Connect it to the path network in `edges` (mark staircases with `{ stairs: true }`).
3. Add an entry to `buildings` (or `pois` for services) that points to that node.

The tests check that every place has a node and that every node can be reached, so a broken graph
fails `npm test`.

## Roadmap ideas

- Indoor floor plans for each building (room-level routing, elevators)
- Live Mensa menus from the Studierendenwerk
- Direct PRIMUSS timetable sync and room-change notifications
- Live bus/train departures at the campus stops
- Free-room finder for study spaces
- German UI translation
