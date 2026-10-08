import { CAMPUSES, getCampus, placesOf } from './data/campus.js';
import { locateRoom, floorLabel } from './lib/rooms.js';
import { findRoute, nearestNode, distanceMeters, walkingMinutes } from './lib/routing.js';
import { openingStatus, describeStatus } from './lib/hours.js';
import { eventsOn, nextEvent, leaveBy, formatCountdown, parseIcs } from './lib/schedule.js';
import { search } from './lib/search.js';

const ON_CAMPUS_RADIUS_M = 1500;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------- persistence ----------

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`hswt.${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`hswt.${key}`, JSON.stringify(value));
    } catch {
      /* private mode / quota – keep working in memory */
    }
  },
};

const state = {
  campus: getCampus(store.get('campus', CAMPUSES[0].id)),
  classes: store.get('classes', []),
  avoidStairs: store.get('avoidStairs', false),
  bufferMin: store.get('bufferMin', 3),
  me: null, // [lat, lng] from geolocation
  selected: null, // { placeId, room? }
};

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const places = () => placesOf(state.campus);
const placeById = (id) => places().find((p) => p.id === id);

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------- tabs ----------

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'map') map?.invalidateSize();
  if (name === 'today') renderToday();
  if (name === 'campus') renderCampus();
}

document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

// ---------- map ----------

let map = null;
let markerLayer = null;
let routeLayer = null;
let meMarker = null;
const markers = new Map();

function initMap() {
  if (!window.L) {
    $('#map').innerHTML = '<p class="muted" style="padding:80px 16px">Map unavailable offline. Search and timetable still work.</p>';
    return;
  }
  map = L.map('map', { zoomControl: false }).setView(state.campus.center, state.campus.zoom);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  map.on('click', closeSheet);
  renderMarkers();
}

const POI_GLYPH = { food: '🍴', study: '📚', transit: '🚌' };

function renderMarkers() {
  if (!map) return;
  markerLayer.clearLayers();
  markers.clear();
  for (const p of places()) {
    const label = p.kind === 'building' ? esc(p.id) : POI_GLYPH[p.category] ?? '•';
    const icon = L.divIcon({
      className: '',
      html: `<div class="marker ${p.kind === 'poi' ? 'poi' : ''}" title="${esc(p.name)}">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const m = L.marker(p.latlng, { icon, keyboard: true, title: p.name, alt: p.name })
      .on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectPlace(p.id);
      })
      .addTo(markerLayer);
    markers.set(p.id, m);
  }
}

function highlightMarker(id) {
  for (const [pid, m] of markers) m.getElement()?.firstElementChild?.classList.toggle('selected', pid === id);
}

// ---------- place sheet & routing ----------

function originOptions() {
  const opts = [];
  if (state.me) opts.push({ value: 'me', label: 'My location' });
  opts.push({ value: `node:${state.campus.entrance}`, label: 'Campus entrance' });
  for (const p of places()) opts.push({ value: `node:${p.node}`, label: p.name });
  return opts;
}

function resolveOrigin(value) {
  if (value === 'me' && state.me) {
    const onCampus = distanceMeters(state.me, state.campus.center) <= ON_CAMPUS_RADIUS_M;
    if (!onCampus) return { node: state.campus.entrance, note: "You're not on campus yet – route starts at the entrance." };
    const snap = nearestNode(state.campus, state.me);
    return { node: snap.id, extraMeters: snap.meters, from: state.me };
  }
  return { node: value.replace(/^node:/, '') };
}

function selectPlace(placeId, { room = null, route = false } = {}) {
  const p = placeById(placeId);
  if (!p) return;
  state.selected = { placeId, room };
  showView('map');
  highlightMarker(placeId);
  map?.setView(p.latlng, Math.max(map.getZoom(), state.campus.zoom), { animate: true });

  const status = openingStatus(p.hours);
  const statusClass = status.open ? (status.closingSoon ? 'soon' : 'open') : 'closed';
  const roomInfo = room
    ? `<p><strong>Room ${esc(room.code)}</strong> · ${esc(floorLabel(room.floor))}${
        room.floorKnown ? '' : ' <span class="muted">(floor not on record)</span>'
      }</p>`
    : '';
  const stepWarning =
    p.kind === 'building' && p.accessible === false
      ? '<p class="status soon">⚠ Upper floors not step-free – ask the porter for assistance.</p>'
      : '';
  const defaultOrigin = state.me ? 'me' : `node:${state.campus.entrance}`;

  $('#sheet-body').innerHTML = `
    <h3>${esc(p.name)}</h3>
    <p class="muted">${esc(p.description ?? '')}</p>
    ${status.known ? `<p class="status ${statusClass}">${esc(describeStatus(status))}</p>` : ''}
    ${roomInfo}
    ${stepWarning}
    <div class="actions">
      <label>From
        <select id="route-from">
          ${originOptions()
            .filter((o) => o.value !== `node:${p.node}`)
            .map((o) => `<option value="${esc(o.value)}" ${o.value === defaultOrigin ? 'selected' : ''}>${esc(o.label)}</option>`)
            .join('')}
        </select>
      </label>
      <button id="route-btn" class="btn primary">Route here</button>
    </div>
    <div id="route-summary"></div>`;
  $('#sheet').hidden = false;
  $('#route-btn').addEventListener('click', () => drawRoute(p, $('#route-from').value));
  if (route) drawRoute(p, $('#route-from').value);
}

function drawRoute(place, originValue) {
  const origin = resolveOrigin(originValue);
  const route = findRoute(state.campus, origin.node, place.node, { avoidStairs: state.avoidStairs });
  const summary = $('#route-summary');
  if (!route) {
    summary.innerHTML = `<div class="route-summary">No ${state.avoidStairs ? 'step-free ' : ''}route found.</div>`;
    return;
  }
  const meters = route.meters + (origin.extraMeters ?? 0);
  const coords = origin.from ? [origin.from, ...route.coords] : route.coords;
  summary.innerHTML = `
    <div class="route-summary">
      <strong>${walkingMinutes(meters)} min walk</strong> · ${Math.round(meters)} m
      ${route.stairs ? '<br><span class="muted">Includes stairs – enable step-free routes in Campus settings.</span>' : ''}
      ${state.avoidStairs ? '<br><span class="muted">Step-free route</span>' : ''}
      ${origin.note ? `<br><span class="muted">${esc(origin.note)}</span>` : ''}
    </div>`;
  if (map) {
    routeLayer.clearLayers();
    L.polyline(coords, { color: '#00653a', weight: 6, opacity: 0.85 }).addTo(routeLayer);
    const sheetH = $('#sheet').offsetHeight;
    map.fitBounds(L.latLngBounds(coords), { paddingTopLeft: [40, 90], paddingBottomRight: [40, sheetH + 30], maxZoom: 18 });
  }
}

function closeSheet() {
  $('#sheet').hidden = true;
  state.selected = null;
  routeLayer?.clearLayers();
  highlightMarker(null);
}
$('#sheet-close').addEventListener('click', closeSheet);

// ---------- geolocation ----------

function locate({ quiet = false } = {}) {
  if (!navigator.geolocation) return quiet || toast('Location is not available on this device.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.me = [pos.coords.latitude, pos.coords.longitude];
      if (map) {
        meMarker?.remove();
        meMarker = L.marker(state.me, {
          icon: L.divIcon({ className: '', html: '<div class="marker me"></div>', iconSize: [18, 18] }),
          interactive: false,
        }).addTo(map);
        if (!quiet) map.setView(state.me, 18);
      }
      if (!quiet) {
        const near = nearestPlace(state.me);
        toast(near ? `You're near ${near.name}` : "You're not on this campus right now.");
      }
      renderToday();
    },
    () => quiet || toast('Could not get your location. Check location permissions.'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  );
}
$('#locate-btn').addEventListener('click', () => locate());

function nearestPlace(latlng) {
  let best = null;
  for (const p of places()) {
    const d = distanceMeters(latlng, p.latlng);
    if (!best || d < best.d) best = { ...p, d };
  }
  return best && best.d < 300 ? best : null;
}

// ---------- search ----------

const input = $('#search-input');
const resultsEl = $('#search-results');
let results = [];
let activeIdx = -1;

function renderResults() {
  resultsEl.hidden = results.length === 0;
  resultsEl.innerHTML = results
    .map(
      (r, i) => `
      <li role="option" data-i="${i}" aria-selected="${i === activeIdx}">
        <div class="title">${esc(r.title)}</div>
        <div class="sub">${esc(r.subtitle ?? '')}</div>
      </li>`,
    )
    .join('');
}

function pickResult(r) {
  input.value = r.title;
  results = [];
  renderResults();
  input.blur();
  if (!r.placeId) return toast('This class has no room on this campus yet.');
  const cls = r.type === 'class' ? state.classes.find((c) => c.title === r.title) : null;
  const room = locateRoom(r.type === 'room' ? r.title.replace(/^Room /, '') : cls?.room, state.campus);
  selectPlace(r.placeId, { room });
}

input.addEventListener('input', () => {
  results = search(input.value, { campus: state.campus, places: places(), classes: state.classes });
  activeIdx = results.length ? 0 : -1;
  renderResults();
});
input.addEventListener('keydown', (e) => {
  if (!results.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    renderResults();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    pickResult(results[Math.max(0, activeIdx)]);
  } else if (e.key === 'Escape') {
    results = [];
    renderResults();
  }
});
resultsEl.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-i]');
  if (li) pickResult(results[Number(li.dataset.i)]);
});

// ---------- today / timetable ----------

function walkTo(room) {
  const loc = locateRoom(room, state.campus);
  if (!loc) return null;
  const origin = resolveOrigin(state.me ? 'me' : `node:${state.campus.entrance}`);
  const route = findRoute(state.campus, origin.node, loc.buildingRef.node, { avoidStairs: state.avoidStairs });
  if (!route) return { loc, minutes: null };
  return { loc, minutes: walkingMinutes(route.meters + (origin.extraMeters ?? 0)), fromLabel: state.me ? 'from here' : 'from the entrance' };
}

function renderToday() {
  const now = new Date();
  const next = nextEvent(state.classes, now);
  const card = $('#next-card');

  if (!next) {
    card.innerHTML = state.classes.length
      ? '<div class="muted">No more classes this week 🎉</div>'
      : `<div class="big">Add your timetable</div>
         <div class="muted">Import an .ics file or add classes below – the navigator will tell you where to go and when to leave.</div>`;
  } else {
    const { entry, startsAt, endsAt, ongoing } = next;
    const walk = walkTo(entry.room);
    const leave = walk?.minutes != null ? leaveBy(startsAt, walk.minutes, state.bufferMin) : null;
    const when = ongoing
      ? `Now · until ${fmtTime(endsAt)}`
      : `${formatCountdown(startsAt - now)} · ${startsAt.toDateString() === now.toDateString() ? '' : DAY_NAMES[startsAt.getDay()] + ' '}${fmtTime(startsAt)}`;
    let leaveText = '';
    if (!ongoing && leave) {
      leaveText = leave <= now ? '<strong>Leave now!</strong>' : `Leave by <strong>${fmtTime(leave)}</strong>`;
      leaveText += ` · ${walk.minutes} min walk ${walk.fromLabel}`;
    }
    card.innerHTML = `
      <div class="muted">${ongoing ? 'Current class' : 'Next class'}</div>
      <div class="big">${esc(entry.title)}</div>
      <div>${esc(when)}</div>
      <div class="muted">${
        walk ? `Room ${esc(walk.loc.code)} · ${esc(walk.loc.buildingRef.name)}, ${esc(floorLabel(walk.loc.floor))}` : esc(entry.room || 'No room set')
      }</div>
      ${leaveText ? `<div style="margin-top:6px">${leaveText}</div>` : ''}
      ${walk ? '<div class="actions"><button class="btn" id="nav-next">Navigate</button></div>' : ''}`;
    $('#nav-next')?.addEventListener('click', () => selectPlace(walk.loc.buildingRef.id, { room: walk.loc, route: true }));
  }

  const today = eventsOn(state.classes, now);
  $('#today-list').innerHTML = today.length
    ? today
        .map(({ entry, startsAt, endsAt }) => {
          const past = endsAt <= now;
          return `<li class="item ${past ? 'muted' : ''}">
            <span class="badge">${fmtTime(startsAt)}</span>
            <div class="grow"><div class="title">${esc(entry.title)}</div>
            <div class="sub">${esc(entry.room || '—')} · until ${fmtTime(endsAt)}</div></div>
          </li>`;
        })
        .join('')
    : '<li class="muted">Nothing scheduled today.</li>';

  const weekly = [...state.classes].sort(
    (a, b) => ((a.day ?? 7) - (b.day ?? 7)) || (a.date ?? '').localeCompare(b.date ?? '') || a.start.localeCompare(b.start),
  );
  $('#timetable-list').innerHTML = weekly.length
    ? weekly
        .map(
          (c) => `<li class="item">
            <span class="badge">${c.date ? esc(c.date.slice(5)) : DAY_NAMES[c.day].slice(0, 2)}</span>
            <div class="grow"><div class="title">${esc(c.title)}</div>
            <div class="sub">${esc(c.start)}–${esc(c.end)} · ${esc(c.room || '—')}</div></div>
            <button class="btn ghost" data-delete="${esc(c.id)}" aria-label="Remove ${esc(c.title)}">✕</button>
          </li>`,
        )
        .join('')
    : '<li class="muted">No classes yet.</li>';
}

$('#timetable-list').addEventListener('click', (e) => {
  const id = e.target.closest('[data-delete]')?.dataset.delete;
  if (!id) return;
  state.classes = state.classes.filter((c) => c.id !== id);
  store.set('classes', state.classes);
  renderToday();
});

$('#class-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const entry = {
    id: `c-${Date.now()}`,
    title: f.get('title').trim(),
    room: f.get('room').trim().toUpperCase(),
    day: Number(f.get('day')),
    start: f.get('start'),
    end: f.get('end'),
  };
  if (entry.end <= entry.start) return toast('End time must be after start time.');
  if (entry.room && !locateRoom(entry.room, state.campus)) toast(`Room "${entry.room}" isn't on the ${state.campus.name} map – saved anyway.`);
  state.classes.push(entry);
  store.set('classes', state.classes);
  e.target.reset();
  renderToday();
});

$('#ics-input').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const imported = parseIcs(await file.text());
  const ids = new Set(imported.map((c) => c.id));
  state.classes = [...state.classes.filter((c) => !ids.has(c.id)), ...imported];
  store.set('classes', state.classes);
  $('#ics-status').textContent = imported.length
    ? `Imported ${imported.length} class${imported.length === 1 ? '' : 'es'}.`
    : 'No events found in that file.';
  e.target.value = '';
  renderToday();
});

// ---------- campus view ----------

function renderCampus() {
  const now = new Date();
  const services = places()
    .filter((p) => p.kind === 'poi')
    .map((p) => ({ p, status: openingStatus(p.hours, now) }))
    .sort((a, b) => Number(!!b.status.open) - Number(!!a.status.open));
  $('#services-list').innerHTML = services
    .map(({ p, status }) => {
      const cls = status.open ? (status.closingSoon ? 'soon' : 'open') : 'closed';
      return `<li class="item clickable" data-place="${esc(p.id)}">
        <span class="badge">${POI_GLYPH[p.category] ?? '•'}</span>
        <div class="grow"><div class="title">${esc(p.name)}</div>
        <div class="sub">${esc(p.description ?? '')}</div>
        ${status.known ? `<div class="status ${cls}">${esc(describeStatus(status))}</div>` : ''}</div>
      </li>`;
    })
    .join('');
  $('#buildings-list').innerHTML = state.campus.buildings
    .map(
      (b) => `<li class="item clickable" data-place="${esc(b.id)}">
        <span class="badge">${esc(b.id)}</span>
        <div class="grow"><div class="title">${esc(b.name)}</div>
        <div class="sub">${esc(b.description)}</div>
        <div class="sub">${b.accessible ? '♿ step-free' : 'Not fully step-free'} · floors ${b.floors.map((f) => (f === 0 ? 'EG' : f)).join(', ')}</div></div>
      </li>`,
    )
    .join('');
}

['#services-list', '#buildings-list'].forEach((sel) =>
  $(sel).addEventListener('click', (e) => {
    const id = e.target.closest('[data-place]')?.dataset.place;
    if (id) selectPlace(id);
  }),
);

const stairsToggle = $('#avoid-stairs');
stairsToggle.checked = state.avoidStairs;
stairsToggle.addEventListener('change', () => {
  state.avoidStairs = stairsToggle.checked;
  store.set('avoidStairs', state.avoidStairs);
});

const bufferInput = $('#buffer-min');
bufferInput.value = state.bufferMin;
bufferInput.addEventListener('change', () => {
  state.bufferMin = Math.min(30, Math.max(0, Number(bufferInput.value) || 0));
  bufferInput.value = state.bufferMin;
  store.set('bufferMin', state.bufferMin);
});

// ---------- campus switcher ----------

const campusSelect = $('#campus-select');
campusSelect.innerHTML = CAMPUSES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
campusSelect.value = state.campus.id;
campusSelect.addEventListener('change', () => {
  state.campus = getCampus(campusSelect.value);
  store.set('campus', state.campus.id);
  closeSheet();
  input.value = '';
  results = [];
  renderResults();
  renderMarkers();
  map?.setView(state.campus.center, state.campus.zoom);
  renderToday();
  renderCampus();
});

// ---------- boot ----------

initMap();
renderToday();
renderCampus();
locate({ quiet: true });
setInterval(() => {
  if ($('#view-today').classList.contains('active')) renderToday();
}, 30000);

// Deep links: ?q=D2.04 opens the room directly (e.g. from a QR code on a door sign or a calendar entry).
const q = new URLSearchParams(location.search).get('q');
if (q) {
  const hit = search(q, { campus: state.campus, places: places(), classes: state.classes })[0];
  if (hit) pickResult(hit);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
