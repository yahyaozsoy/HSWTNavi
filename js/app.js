import { CAMPUSES, getCampus, placesOf } from './data/campus.js';
import { locateRoom, locateBuilding } from './lib/rooms.js';
import { distanceMeters, estimateWalk, nearest } from './lib/routing.js';
import { getDirections } from './lib/directions.js';
import { openingStatus } from './lib/hours.js';
import { eventsOn, nextEvent, leaveBy, parseIcs, isoDate } from './lib/schedule.js';
import { search } from './lib/search.js';
import { createI18n, detectLanguage } from './lib/i18n.js';
import { menuUrl, dishesOn } from './lib/mensa.js';

const IN_FREISING_RADIUS_M = 5000; // further away → routes start at Freising station
const NEAR_PLACE_RADIUS_M = 150;

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
  lang: detectLanguage(store.get('lang', null), navigator.languages ?? [navigator.language]),
  me: null, // [lat, lng] from geolocation
  selected: null, // { placeId, room, routed }
};
let i18n = createI18n(state.lang);
const t = (...args) => i18n.t(...args);

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const places = () => placesOf(state.campus);
const placeById = (id) => places().find((p) => p.id === id);
const statusClass = (s) => (s.open ? (s.closingSoon ? 'soon' : 'open') : 'closed');

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------- language ----------

function applyLanguage() {
  i18n = createI18n(state.lang);
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  const daySelect = $('#day-select');
  const selectedDay = daySelect.value || '1';
  daySelect.innerHTML = [1, 2, 3, 4, 5, 6].map((d) => `<option value="${d}">${esc(i18n.weekday(d))}</option>`).join('');
  daySelect.value = selectedDay;
  $('#about-data').textContent = t('about.data', { err: Math.round(state.campus.georeference.medianErrorM) });

  renderMarkers();
  renderToday();
  renderCampus();
  if (state.selected && !$('#sheet').hidden) {
    selectPlace(state.selected.placeId, { room: state.selected.room, route: state.selected.routed, keepView: true });
  }
  if (input.value) runSearch();
}

document.querySelectorAll('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    state.lang = b.dataset.lang;
    store.set('lang', state.lang);
    applyLanguage();
  }),
);

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
let shapeLayer = null;
let markerLayer = null;
let routeLayer = null;
let meMarker = null;
const markers = new Map();

const COLORS = { hswt: '#79b829', hswtLine: '#4d8a12', residence: '#8a5525', service: '#a05667' };
const GLYPH = { food: '🍴', transit: 'H', residence: 'WH', service: '✝', parking: 'P' };

function initMap() {
  if (!window.L) {
    $('#map').innerHTML = `<p class="muted" style="padding:80px 16px">${esc(t('map.offline'))}</p>`;
    return;
  }
  map = L.map('map', { zoomControl: false });
  fitCampus();
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Lageplan © HSWT',
  }).addTo(map);
  shapeLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  map.on('click', closeSheet);
  // Stops and car parks only appear once zoomed in, so the overview stays readable.
  const updateZoomClass = () => map.getContainer().classList.toggle('zoomed-out', map.getZoom() < 17);
  map.on('zoomend', updateZoomClass);
  updateZoomClass();
}

// Show every HSWT building of the campus, leaving room for the search bar.
function fitCampus() {
  const bounds = L.latLngBounds(state.campus.buildings.map((b) => b.latlng));
  map.fitBounds(bounds, { paddingTopLeft: [20, 80], paddingBottomRight: [20, 20] });
}

function divIcon(cls, label, size) {
  return L.divIcon({
    className: '',
    html: `<div class="marker ${cls}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function renderMarkers() {
  if (!map) return;
  shapeLayer.clearLayers();
  markerLayer.clearLayers();
  markers.clear();

  for (const ring of state.campus.unlabeledFootprints) {
    L.polygon(ring, { color: COLORS.hswtLine, weight: 1, fillColor: COLORS.hswt, fillOpacity: 0.35, interactive: false }).addTo(
      shapeLayer,
    );
  }
  for (const latlng of state.campus.parking) {
    L.marker(latlng, { icon: divIcon('parking', 'P', 18), interactive: false, keyboard: false }).addTo(markerLayer);
  }

  for (const p of places()) {
    const color = p.kind === 'residence' ? COLORS.residence : p.kind === 'service' ? COLORS.service : COLORS.hswt;
    for (const ring of p.footprints ?? []) {
      L.polygon(ring, { color: p.kind === 'building' ? COLORS.hswtLine : color, weight: 1.5, fillColor: color, fillOpacity: 0.7 })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectPlace(p.id);
        })
        .addTo(shapeLayer);
    }
    let icon;
    if (p.kind === 'building') icon = divIcon('', esc(p.id), 32);
    else if (p.kind === 'transit') icon = divIcon('stop', 'H', 20);
    else icon = divIcon(`poi ${p.kind}`, GLYPH[p.kind] ?? '•', 28);
    const name = i18n.pick(p.name);
    const m = L.marker(p.latlng, { icon, keyboard: true, title: name, alt: name, zIndexOffset: p.kind === 'transit' ? -100 : 0 })
      .on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectPlace(p.id);
      })
      .addTo(markerLayer);
    markers.set(p.id, m);
  }
  if (state.selected) highlightMarker(state.selected.placeId);
}

function highlightMarker(id) {
  for (const [pid, m] of markers) m.getElement()?.firstElementChild?.classList.toggle('selected', pid === id);
}

// ---------- origins & routes ----------

function originOptions(excludeId) {
  const opts = [];
  if (state.me) opts.push({ value: 'me', label: t('route.myLocation') });
  opts.push({ value: 'station', label: t('route.station') });
  for (const p of places()) {
    if (p.id === excludeId || p.kind === 'transit') continue;
    opts.push({ value: `place:${p.id}`, label: i18n.pick(p.name) });
  }
  return opts;
}

function resolveOrigin(value) {
  if (value === 'me' && state.me) {
    if (distanceMeters(state.me, state.campus.center) > IN_FREISING_RADIUS_M) {
      return { latlng: state.campus.station, key: 'station', note: t('route.farAway') };
    }
    return { latlng: state.me, key: `me:${state.me.map((v) => v.toFixed(3)).join(',')}` };
  }
  if (value?.startsWith('place:')) {
    const p = placeById(value.slice(6));
    if (p) return { latlng: p.latlng, key: value };
  }
  return { latlng: state.campus.station, key: 'station' };
}

const defaultOrigin = () => (state.me ? 'me' : 'station');

// Route results are cached so "leave by" and the map share one request per origin/target.
const routeCache = new Map();
const routeKey = (origin, targetKey) => `${origin.key}|${targetKey}|${state.avoidStairs}|${state.lang}`;

function routeFor(origin, target, targetKey) {
  const key = routeKey(origin, targetKey);
  if (!routeCache.has(key)) {
    const entry = { promise: null, settled: null };
    entry.promise = getDirections(origin.latlng, target, { stepFree: state.avoidStairs, lang: state.lang })
      .then((r) => (entry.settled = r))
      .catch(() => null);
    routeCache.set(key, entry);
  }
  return routeCache.get(key);
}

// ---------- place sheet ----------

let routeRequest = 0;

function selectPlace(placeId, { room = null, route = false, keepView = false } = {}) {
  const p = placeById(placeId);
  if (!p) return;
  state.selected = { placeId, room, routed: route };
  showView('map');
  highlightMarker(placeId);
  if (map && !keepView) map.setView(p.latlng, Math.max(map.getZoom(), 17), { animate: true });

  const status = openingStatus(p.hours);
  const roomInfo = room
    ? `<p><strong>${esc(t('room.title', { code: room.code }))}</strong> · ${esc(i18n.floor(room.floor))}${
        room.floorKnown ? '' : ` <span class="muted">${esc(t('room.floorUnknown'))}</span>`
      }</p>`
    : '';
  const origin = defaultOrigin();
  const kindLabel = t(`kind.${p.kind}`);

  $('#sheet-body').innerHTML = `
    <h3>${esc(i18n.pick(p.name))}</h3>
    <p class="muted">${esc([kindLabel, i18n.pick(p.description)].filter(Boolean).join(' · '))}</p>
    ${
      status.known
        ? `<p class="status ${statusClass(status)}">${esc(i18n.openingStatus(status))}</p>
           <p class="muted small">${esc(t('sheet.hoursSource'))}</p>`
        : ''
    }
    ${roomInfo}
    <div class="actions">
      <label>${esc(t('route.from'))}
        <select id="route-from">
          ${originOptions(p.id)
            .map((o) => `<option value="${esc(o.value)}" ${o.value === origin ? 'selected' : ''}>${esc(o.label)}</option>`)
            .join('')}
        </select>
      </label>
      <button id="route-btn" class="btn primary">${esc(t('route.go'))}</button>
    </div>
    <div id="route-summary"></div>
    ${p.menu ? `<h4>${esc(t('sheet.menu'))}</h4><div id="menu">${esc(t('sheet.menuLoading'))}</div>` : ''}`;
  $('#sheet').hidden = false;
  $('#route-btn').addEventListener('click', () => drawRoute(p, $('#route-from').value));
  if (route) drawRoute(p, $('#route-from').value);
  if (p.menu) loadMenu(p.menu);
}

async function drawRoute(place, originValue) {
  const id = ++routeRequest;
  state.selected.routed = true;
  const origin = resolveOrigin(originValue);
  const summary = $('#route-summary');
  summary.innerHTML = `<div class="route-summary">${esc(t('route.loading'))}</div>`;

  const route = await routeFor(origin, place.latlng, place.id).promise;
  if (id !== routeRequest || !$('#route-summary')) return; // a newer request or the sheet closed
  if (!route) {
    $('#route-summary').innerHTML = `<div class="route-summary">${esc(t('route.none'))}</div>`;
    return;
  }
  const notes = [
    state.avoidStairs && !route.approx && !route.noStepFree ? t('route.stepFree') : '',
    route.noStepFree ? t('route.osrmFallback') : '',
    route.approx ? t('route.approx') : '',
    origin.note ?? '',
  ].filter(Boolean);
  const steps = route.steps.length
    ? `<details ${route.steps.length <= 6 ? 'open' : ''}><summary>${esc(t('route.steps'))}</summary><ol class="steps">${route.steps
        .map((s) => `<li>${esc(s.text)}${s.meters >= 10 ? ` <span class="muted">${esc(i18n.distance(s.meters))}</span>` : ''}</li>`)
        .join('')}</ol></details>`
    : '';
  $('#route-summary').innerHTML = `
    <div class="route-summary">
      <strong>${esc(t('route.summary', { min: route.minutes, dist: i18n.distance(route.meters) }))}</strong>
      ${notes.map((n) => `<br><span class="muted">${esc(n)}</span>`).join('')}
      ${steps}
      ${route.provider ? `<div class="muted small">${esc(t('route.attribution', { provider: route.provider }))}</div>` : ''}
    </div>`;

  if (map) {
    routeLayer.clearLayers();
    const line = L.polyline(route.coords, {
      color: '#00653a',
      weight: 6,
      opacity: 0.85,
      dashArray: route.approx ? '8 10' : null,
    }).addTo(routeLayer);
    const sheetH = $('#sheet').offsetHeight;
    map.fitBounds(line.getBounds(), { paddingTopLeft: [40, 90], paddingBottomRight: [40, sheetH + 30], maxZoom: 18 });
  }
}

// ---------- Mensa menu ----------

const menuCache = new Map();
async function loadMenu(canteenId) {
  const today = new Date();
  const url = menuUrl(canteenId, today);
  if (!menuCache.has(url)) {
    menuCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error(`HTTP ${r.status}`))))
        .catch((e) => {
          menuCache.delete(url);
          throw e;
        }),
    );
  }
  const el = () => $('#menu');
  try {
    const dishes = dishesOn(await menuCache.get(url), isoDate(today));
    if (!el()) return;
    el().innerHTML = dishes.length
      ? `<ul class="menu">${dishes
          .map(
            (d) =>
              `<li><span>${esc(d.icons)} ${esc(d.name)} <span class="muted small">${esc(d.type)}</span></span><span class="price">${esc(d.price)}</span></li>`,
          )
          .join('')}</ul><p class="muted small">Studierendenwerk München Oberbayern · eat-api</p>`
      : esc(t('sheet.menuNone'));
  } catch {
    if (el()) el().textContent = t('sheet.menuError');
  }
}

function closeSheet() {
  $('#sheet').hidden = true;
  state.selected = null;
  routeRequest++;
  routeLayer?.clearLayers();
  highlightMarker(null);
}
$('#sheet-close').addEventListener('click', closeSheet);

// ---------- geolocation ----------

function locate({ quiet = false } = {}) {
  if (!navigator.geolocation) return quiet || toast(t('toast.noGeo'));
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.me = [pos.coords.latitude, pos.coords.longitude];
      if (map) {
        meMarker?.remove();
        meMarker = L.marker(state.me, { icon: divIcon('me', '', 18), interactive: false }).addTo(map);
        if (!quiet) map.setView(state.me, 18);
      }
      if (!quiet) {
        const near = nearest(places().filter((p) => p.kind !== 'transit'), state.me);
        toast(
          near && near.meters < NEAR_PLACE_RADIUS_M ? t('toast.near', { name: i18n.pick(near.item.name) }) : t('toast.notOnCampus'),
        );
      }
      renderToday();
    },
    () => quiet || toast(t('toast.geoDenied')),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  );
}
$('#locate-btn').addEventListener('click', () => locate());

// ---------- search ----------

const input = $('#search-input');
const resultsEl = $('#search-results');
let results = [];
let activeIdx = -1;

function runSearch() {
  results = search(input.value, { campus: state.campus, places: places(), classes: state.classes, i18n });
  activeIdx = results.length ? 0 : -1;
  renderResults();
}

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
  if (!r.placeId) return toast(t('toast.classNoRoom'));
  selectPlace(r.placeId, { room: r.room ?? null });
}

input.addEventListener('input', runSearch);
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

function classTarget(room) {
  const loc = locateRoom(room, state.campus);
  const building = loc?.buildingRef ?? locateBuilding(room, state.campus);
  return building ? { loc, building } : null;
}

// Walking time for the next class: straight-line estimate first, replaced by the real route once it arrives.
function walkTo(target) {
  const origin = resolveOrigin(defaultOrigin());
  const fromLabel = origin.key === 'station' ? t('today.fromStation') : t('today.fromHere');
  const entry = routeFor(origin, target.building.latlng, target.building.id);
  if (entry.settled) return { minutes: entry.settled.minutes, fromLabel };
  if (!entry.rerender) entry.rerender = entry.promise.then((r) => r && renderToday());
  return { minutes: estimateWalk(origin.latlng, target.building.latlng).minutes, fromLabel };
}

function renderToday() {
  const now = new Date();
  const next = nextEvent(state.classes, now);
  const card = $('#next-card');

  if (!next) {
    card.innerHTML = state.classes.length
      ? `<div class="muted">${esc(t('today.none'))}</div>`
      : `<div class="big">${esc(t('today.emptyTitle'))}</div><div class="muted">${esc(t('today.emptyText'))}</div>`;
  } else {
    const { entry, startsAt, endsAt, ongoing } = next;
    const target = classTarget(entry.room);
    const walk = target ? walkTo(target) : null;
    const sameDay = startsAt.toDateString() === now.toDateString();
    const when = ongoing
      ? t('today.nowUntil', { time: i18n.time(endsAt) })
      : `${i18n.countdown(startsAt - now)} · ${sameDay ? '' : `${i18n.weekday(startsAt.getDay())} `}${i18n.time(startsAt)}`;
    let leaveText = '';
    if (!ongoing && walk) {
      const leave = leaveBy(startsAt, walk.minutes, state.bufferMin);
      leaveText = leave <= now ? `<strong>${esc(t('today.leaveNow'))}</strong>` : t('today.leaveBy', { time: esc(i18n.time(leave)) });
      leaveText += ` · ${esc(t('today.walk', { min: walk.minutes, from: walk.fromLabel }))}`;
    }
    let where = entry.room ? t('today.roomUnknown', { room: entry.room }) : t('today.noRoom');
    if (target?.loc) {
      where = `${t('room.title', { code: target.loc.code })} · ${i18n.pick(target.building.name)}, ${i18n.floor(target.loc.floor)}`;
    } else if (target) {
      where = i18n.pick(target.building.name);
    }
    card.innerHTML = `
      <div class="muted">${esc(ongoing ? t('today.current') : t('today.next'))}</div>
      <div class="big">${esc(entry.title)}</div>
      <div>${esc(when)}</div>
      <div class="muted">${esc(where)}</div>
      ${leaveText ? `<div style="margin-top:6px">${leaveText}</div>` : ''}
      ${target ? `<div class="actions"><button class="btn" id="nav-next">${esc(t('today.navigate'))}</button></div>` : ''}`;
    $('#nav-next')?.addEventListener('click', () => selectPlace(target.building.id, { room: target.loc, route: true }));
  }

  const today = eventsOn(state.classes, now);
  $('#today-list').innerHTML = today.length
    ? today
        .map(({ entry, startsAt, endsAt }) => {
          const past = endsAt <= now;
          return `<li class="item ${past ? 'muted' : ''}">
            <span class="badge">${esc(i18n.time(startsAt))}</span>
            <div class="grow"><div class="title">${esc(entry.title)}</div>
            <div class="sub">${esc(entry.room || '—')} · ${esc(t('today.until', { time: i18n.time(endsAt) }))}</div></div>
          </li>`;
        })
        .join('')
    : `<li class="muted">${esc(t('today.nothing'))}</li>`;

  const sorted = [...state.classes].sort(
    (a, b) => (a.day ?? 7) - (b.day ?? 7) || (a.date ?? '').localeCompare(b.date ?? '') || a.start.localeCompare(b.start),
  );
  $('#timetable-list').innerHTML = sorted.length
    ? sorted
        .map(
          (c) => `<li class="item">
            <span class="badge">${c.date ? esc(c.date.slice(5)) : esc(i18n.weekday(c.day, true))}</span>
            <div class="grow"><div class="title">${esc(c.title)}</div>
            <div class="sub">${esc(c.start)}–${esc(c.end)} · ${esc(c.room || '—')}</div></div>
            <button class="btn ghost" data-delete="${esc(c.id)}" aria-label="${esc(t('timetable.remove', { title: c.title }))}">✕</button>
          </li>`,
        )
        .join('')
    : `<li class="muted">${esc(t('timetable.empty'))}</li>`;
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
  if (entry.end <= entry.start) return toast(t('form.endBeforeStart'));
  if (entry.room && !classTarget(entry.room)) toast(t('form.roomNotFound', { room: entry.room }));
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
  $('#ics-status').textContent = imported.length ? t('ics.imported', { n: imported.length }) : t('ics.none');
  e.target.value = '';
  renderToday();
});

// ---------- campus view ----------

function placeItem(p, { badge, status } = {}) {
  return `<li class="item clickable" data-place="${esc(p.id)}">
    <span class="badge">${esc(badge ?? p.id)}</span>
    <div class="grow"><div class="title">${esc(i18n.pick(p.name))}</div>
    ${p.description ? `<div class="sub">${esc(i18n.pick(p.description))}</div>` : ''}
    ${status?.known ? `<div class="status ${statusClass(status)}">${esc(i18n.openingStatus(status))}</div>` : ''}</div>
  </li>`;
}

function renderCampus() {
  const now = new Date();
  $('#food-list').innerHTML = state.campus.pois
    .filter((p) => p.kind === 'food')
    .map((p) => ({ p, status: openingStatus(p.hours, now) }))
    .sort((a, b) => Number(!!b.status.open) - Number(!!a.status.open))
    .map(({ p, status }) => placeItem(p, { badge: GLYPH.food, status }))
    .join('');
  $('#services-list').innerHTML = [
    ...state.campus.buildings.filter((b) => b.description),
    ...state.campus.pois.filter((p) => p.kind === 'service'),
  ]
    .map((p) => placeItem(p, { badge: p.kind === 'building' ? p.id : GLYPH.service }))
    .join('');
  $('#buildings-list').innerHTML = state.campus.buildings
    .map(
      (b) => `<li class="item clickable" data-place="${esc(b.id)}">
        <span class="badge">${esc(b.id)}</span><div class="grow"><div class="title">${esc(i18n.pick(b.name))}</div></div>
      </li>`,
    )
    .join('');
}

['#food-list', '#services-list', '#buildings-list'].forEach((sel) =>
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

// ---------- campus switcher (shown once there is more than one campus) ----------

const campusSelect = $('#campus-select');
campusSelect.closest('label').hidden = CAMPUSES.length < 2;
campusSelect.innerHTML = CAMPUSES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
campusSelect.value = state.campus.id;
campusSelect.addEventListener('change', () => {
  state.campus = getCampus(campusSelect.value);
  store.set('campus', state.campus.id);
  closeSheet();
  input.value = '';
  results = [];
  renderResults();
  if (map) fitCampus();
  applyLanguage();
});

// ---------- boot ----------

initMap();
applyLanguage();
locate({ quiet: true });
setInterval(() => {
  if ($('#view-today').classList.contains('active')) renderToday();
}, 30000);

// Deep links: ?q=A6 1.12 opens the room directly (e.g. from a QR code on a door sign or a calendar entry).
const q = new URLSearchParams(location.search).get('q');
if (q) {
  const hit = search(q, { campus: state.campus, places: places(), classes: state.classes, i18n })[0];
  if (hit) pickResult(hit);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
