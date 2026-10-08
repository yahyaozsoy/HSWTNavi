import { CAMPUSES, getCampus, placesOf } from './data/campus.js';
import { PERSON_DIRECTORY_URL, RETRIEVED, FACULTIES } from './data/hswt.js';
import { LABELS, ALLERGEN_FAMILIES } from './data/mensa-labels.js';
import { locateRoom, locateBuilding } from './lib/rooms.js';
import { distanceMeters, estimateWalk, nearest } from './lib/routing.js';
import { getDirections } from './lib/directions.js';
import { openingStatus } from './lib/hours.js';
import { eventsOn, nextEvent, leaveBy, parseIcs, isoDate } from './lib/schedule.js';
import { search } from './lib/search.js';
import { createI18n, detectLanguage } from './lib/i18n.js';
import {
  menuUrl,
  menuWeekStart,
  daysOf,
  formatPrice,
  matchesDiet,
  conflicts,
  groupByType,
  ROLES,
  DIETS,
  EAT_API,
} from './lib/mensa.js';

const IN_FREISING_RADIUS_M = 5000; // further away → routes start at Freising station
const NEAR_PLACE_RADIUS_M = 150;
const MAX_RECENT = 6;

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
  contacts: store.get('contacts', []),
  saved: store.get('saved', []), // [{ key, title, subtitle, placeId, roomCode, personId }]
  recent: store.get('recent', []),
  avoidStairs: store.get('avoidStairs', false),
  theme: store.get('theme', 'auto'), // 'auto' | 'light' | 'dark'
  bufferMin: store.get('bufferMin', 3),
  lang: detectLanguage(store.get('lang', null), navigator.languages ?? [navigator.language]),
  mensa: { role: store.get('mensaRole', 'students'), diet: store.get('mensaDiet', 'all'), avoid: store.get('allergens', []), hide: store.get('hideConflicts', false), week: 0, day: null },
  me: null, // [lat, lng] from geolocation
  selected: null, // { placeId, room, personId, routed }
};
let i18n = createI18n(state.lang);
const t = (...args) => i18n.t(...args);

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const places = () => placesOf(state.campus);
const placeById = (id) => places().find((p) => p.id === id);
const buildingById = (id) => state.campus.buildings.find((b) => b.id === id);
const statusClass = (s) => (s.open ? (s.closingSoon ? 'soon' : 'open') : 'closed');
const personById = (id) => state.campus.people.find((p) => p.id === id) ?? state.contacts.find((c) => c.id === id);
const isTouchWide = () => window.matchMedia('(min-width: 800px)').matches;

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
  $('#about-data').textContent = t('about.data', { date: i18n.shortDate(new Date(RETRIEVED)) });
  $('#people-help').textContent = t('campus.peopleHelp', { date: i18n.shortDate(new Date(RETRIEVED)) });
  $('#directory-link').href = PERSON_DIRECTORY_URL;

  renderChips();
  renderMarkers();
  renderToday();
  renderCampus();
  renderMensa();
  if (state.selected && !$('#sheet').hidden) {
    const { placeId, room, personId, routed } = state.selected;
    selectPlace(placeId, { room, personId, route: routed, keepView: true });
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

// ---------- theme ----------

const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
const isDark = () => state.theme === 'dark' || (state.theme === 'auto' && !!darkQuery?.matches);

function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = state.theme;
  const dark = isDark();
  $('#theme-btn').textContent = dark ? '☀️' : '🌙';
  $('#theme-select').value = state.theme;
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0b1f15' : '#004d2c';
}

function setTheme(theme) {
  state.theme = theme;
  store.set('theme', theme);
  applyTheme();
}

$('#theme-btn').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
$('#theme-select').addEventListener('change', (e) => setTheme(e.target.value));
darkQuery?.addEventListener?.('change', () => state.theme === 'auto' && applyTheme());

// ---------- tabs ----------

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'map') map?.invalidateSize();
  if (name === 'today') renderToday();
  if (name === 'mensa') renderMensa();
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

const COLORS = { hswt: '#79b829', hswtLine: '#4d8a12', residence: '#8a5525', community: '#a05667', study: '#2f6fb3' };
const GLYPH = { food: '🍴', transit: 'H', residence: 'WH', community: '✝', service: 'i', study: '📖' };

function initMap() {
  if (!window.L) {
    $('#map').innerHTML = `<p class="muted" style="padding:120px 16px">${esc(t('map.offline'))}</p>`;
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
  map.fitBounds(bounds, { paddingTopLeft: [isTouchWide() ? 440 : 20, 120], paddingBottomRight: [20, 20] });
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
    L.polygon(ring, { color: COLORS.hswtLine, weight: 1, fillColor: COLORS.hswt, fillOpacity: 0.35, interactive: false }).addTo(shapeLayer);
  }
  for (const latlng of state.campus.parking) {
    L.marker(latlng, { icon: divIcon('parking', 'P', 18), interactive: false, keyboard: false }).addTo(markerLayer);
  }

  for (const p of places()) {
    if (p.kind === 'service') continue; // shown inside their building
    const color = COLORS[p.kind] ?? COLORS.hswt;
    for (const ring of p.footprints ?? []) {
      L.polygon(ring, { color: p.kind === 'building' ? COLORS.hswtLine : color, weight: 1.5, fillColor: color, fillOpacity: 0.7 })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectPlace(p.id);
        })
        .addTo(shapeLayer);
    }
    let icon;
    if (p.kind === 'building') icon = divIcon(p.services?.length ? 'has-info' : '', esc(p.id), 32);
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
  const target = placeById(id)?.kind === 'service' ? placeById(id).building : id;
  for (const [pid, m] of markers) m.getElement()?.firstElementChild?.classList.toggle('selected', pid === target);
}

// ---------- origins & routes ----------

function originOptionsHtml(excludeId, selected) {
  const opt = (value, label) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
  const start = [state.me ? opt('me', t('route.myLocation')) : '', opt('station', t('route.station'))].join('');
  const buildings = state.campus.buildings.filter((b) => b.id !== excludeId).map((b) => opt(`place:${b.id}`, i18n.pick(b.name)));
  const other = state.campus.pois
    .filter((p) => p.id !== excludeId && ['food', 'residence', 'community'].includes(p.kind))
    .map((p) => opt(`place:${p.id}`, i18n.pick(p.name)));
  return `<optgroup label="${esc(t('route.group.start'))}">${start}</optgroup>
    <optgroup label="${esc(t('route.group.buildings'))}">${buildings.join('')}</optgroup>
    <optgroup label="${esc(t('route.group.other'))}">${other.join('')}</optgroup>`;
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
function routeFor(origin, target, targetKey) {
  const key = `${origin.key}|${targetKey}|${state.avoidStairs}|${state.lang}`;
  if (!routeCache.has(key)) {
    const entry = { promise: null, settled: null };
    entry.promise = getDirections(origin.latlng, target, { stepFree: state.avoidStairs, lang: state.lang })
      .then((r) => (entry.settled = r))
      .catch(() => null);
    routeCache.set(key, entry);
  }
  return routeCache.get(key);
}

// ---------- favourites & recents ----------

function itemKey({ placeId, room, roomCode, personId }) {
  if (personId) return `person:${personId}`;
  if (room?.code || roomCode) return `room:${room?.code ?? roomCode}`;
  return `place:${placeId}`;
}

function itemTitle(sel) {
  if (sel.personId) return personById(sel.personId)?.name ?? '';
  if (sel.room) return t('room.title', { code: sel.room.code });
  return i18n.pick(placeById(sel.placeId)?.name);
}

function rememberRecent(sel) {
  const entry = { key: itemKey(sel), placeId: sel.placeId, roomCode: sel.room?.code ?? null, personId: sel.personId ?? null };
  state.recent = [entry, ...state.recent.filter((r) => r.key !== entry.key)].slice(0, MAX_RECENT);
  store.set('recent', state.recent);
}

const isSaved = (sel) => state.saved.some((s) => s.key === itemKey(sel));

function toggleSaved(sel) {
  const key = itemKey(sel);
  state.saved = isSaved(sel)
    ? state.saved.filter((s) => s.key !== key)
    : [...state.saved, { key, placeId: sel.placeId, roomCode: sel.room?.code ?? null, personId: sel.personId ?? null }];
  store.set('saved', state.saved);
}

// Stored entry → arguments for selectPlace (rooms and people are resolved freshly).
function openStored(entry) {
  const room = entry.roomCode ? locateRoom(entry.roomCode, state.campus) : null;
  selectPlace(entry.placeId, { room, personId: entry.personId });
}

function storedLabel(entry) {
  const room = entry.roomCode ? locateRoom(entry.roomCode, state.campus) : null;
  const title = itemTitle({ placeId: entry.placeId, room, personId: entry.personId });
  const person = entry.personId && personById(entry.personId);
  const sub = person ? person.room : room ? i18n.pick(buildingById(room.building)?.name) : t(`kind.${placeById(entry.placeId)?.kind ?? 'building'}`);
  return { title, sub };
}

// ---------- place sheet ----------

let routeRequest = 0;

const row = (label, value) => (value ? `<div class="info-row"><span class="info-label">${esc(label)}</span><span>${value}</span></div>` : '');

function selectPlace(placeId, { room = null, personId = null, route = false, keepView = false } = {}) {
  const p = placeById(placeId);
  if (!p) return;
  const sel = { placeId, room, personId, routed: route };
  state.selected = sel;
  rememberRecent(sel);
  showView('map');
  $('#welcome').hidden = true;
  highlightMarker(placeId);
  if (map && !keepView) {
    // On tablets the panel covers the left side, so centre the place in the visible part.
    const point = L.latLngBounds([p.latlng, p.latlng]);
    map.fitBounds(point, { paddingTopLeft: [isTouchWide() ? 440 : 0, 130], paddingBottomRight: [0, isTouchWide() ? 0 : 300], maxZoom: Math.max(map.getZoom(), 18) });
  }

  const person = personId ? personById(personId) : null;
  const building = p.kind === 'building' ? p : p.building ? buildingById(p.building) : null;
  const status = openingStatus(p.hours);
  const title = person ? person.name : room ? t('room.title', { code: room.code }) : i18n.pick(p.name);
  const kind = person ? t(person.url ? 'kind.person' : 'kind.contact') : room ? t('kind.room') : t(`kind.${p.kind}`);
  const subtitle = person ? i18n.pick(person.field) || i18n.pick(FACULTIES[person.faculty]) : room ? i18n.pick(p.name) : i18n.pick(p.subtitle) || i18n.pick(p.description);

  const roomCode = person?.room ?? room?.code ?? p.room;
  const roomBuilding = building ?? (roomCode ? buildingById(roomCode.split('.')[0]) : null);
  const info = [
    row(t('sheet.room'), roomCode ? `<strong>${esc(roomCode)}</strong> · ${esc(i18n.pick(roomBuilding?.name))}` : ''),
    row(t('sheet.address'), esc(p.address ?? building?.address ?? '')),
    status.known
      ? row(
          t('sheet.hours'),
          `<span class="status ${statusClass(status)}">${esc(i18n.openingStatus(status))}</span><br>${i18n
            .weeklyHours(p.hours)
            .map(esc)
            .join('<br>')}${p.note ? `<br><span class="muted small">${esc(i18n.pick(p.note))}</span>` : ''}`,
        )
      : p.note
        ? row(t('sheet.hours'), `<span class="muted small">${esc(i18n.pick(p.note))}</span>`)
        : '',
    row(t('sheet.phone'), p.phone ? `<a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">${esc(p.phone)}</a>` : ''),
    row(t('sheet.email'), p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''),
    row(t('sheet.note'), person?.note ? esc(i18n.pick(person.note)) : ''),
  ].join('');

  const links = [
    person?.url ? `<a class="btn link" href="${esc(person.url)}" target="_blank" rel="noopener">${esc(t('sheet.profile'))} ↗</a>` : '',
    !person && p.url
      ? `<a class="btn link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t(/hswt\.de/.test(p.url) ? 'sheet.website' : 'sheet.websiteOther'))} ↗</a>`
      : '',
  ].join('');

  let inside = '';
  if (p.kind === 'building' && !room && !person) {
    const services = (p.services ?? []).map((id) => placeById(id)).filter(Boolean);
    const people = state.campus.people.filter((x) => x.building === p.id);
    inside = [
      services.length
        ? `<h4>${esc(t('sheet.inside'))}</h4><div class="chip-row">${services
            .map((s) => `<button class="chip" data-open-place="${esc(s.id)}">${esc(i18n.pick(s.name))}</button>`)
            .join('')}</div>`
        : '',
      people.length
        ? `<details><summary>${esc(t('sheet.people'))} (${people.length})</summary><ul class="mini-list">${people
            .map((x) => `<li><button class="linklike" data-open-person="${esc(x.id)}">${esc(x.name)}</button> <span class="muted">${esc(x.room)}</span></li>`)
            .join('')}</ul></details>`
        : '',
    ].join('');
  }

  const roomHint = roomCode && roomBuilding ? `<p class="muted small">${esc(t('room.hint', { room: roomCode, building: roomBuilding.id }))}</p>` : '';
  const planNote = (building ?? p).source === 'plan' ? `<p class="muted small">${esc(t('sheet.positionPlan'))}</p>` : '';
  const sourceNote = person?.url || p.kind === 'service' ? `<p class="muted small">${esc(t('sheet.source', { date: i18n.shortDate(new Date(RETRIEVED)) }))}</p>` : '';
  const saved = isSaved(sel);

  $('#sheet-body').innerHTML = `
    <div class="sheet-head">
      <div class="eyebrow">${esc(kind)}</div>
      <h3>${esc(title)}</h3>
      ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
    </div>
    <div class="actions top-actions">
      <button id="route-btn" class="btn primary">${esc(t('route.go'))}</button>
      <button id="save-btn" class="btn" aria-pressed="${saved}" aria-label="${esc(t(saved ? 'sheet.saved' : 'sheet.save'))}">${saveLabel(saved)}</button>
      <button id="share-btn" class="btn" aria-label="${esc(t('sheet.share'))}">↗ <span class="btn-label">${esc(t('sheet.share'))}</span></button>
      ${person && !person.url ? `<button id="remove-contact" class="btn ghost">${esc(t('sheet.removeContact'))}</button>` : ''}
    </div>
    <label class="from-row">${esc(t('route.from'))}
      <select id="route-from">${originOptionsHtml(p.kind === 'service' ? p.building : p.id, defaultOrigin())}</select>
    </label>
    <div id="route-summary"></div>
    <div class="info">${info}</div>
    ${links ? `<div class="actions">${links}</div>` : ''}
    ${roomHint}
    ${inside}
    ${p.menu ? `<h4>${esc(t('sheet.todayMenu'))}</h4><div id="menu-preview" class="muted">${esc(t('mensa.loading'))}</div>` : ''}
    ${planNote}${sourceNote}`;
  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.classList.remove('collapsed');
  sheet.scrollTop = 0;

  $('#route-btn').addEventListener('click', () => drawRoute(p, $('#route-from').value));
  $('#route-from').addEventListener('change', () => state.selected?.routed && drawRoute(p, $('#route-from').value));
  $('#save-btn').addEventListener('click', () => {
    toggleSaved(sel);
    const now = isSaved(sel);
    $('#save-btn').innerHTML = saveLabel(now);
    $('#save-btn').setAttribute('aria-label', t(now ? 'sheet.saved' : 'sheet.save'));
    $('#save-btn').setAttribute('aria-pressed', String(now));
    renderCampus();
  });
  $('#share-btn').addEventListener('click', () => share(title, roomCode ?? person?.name ?? p.id));
  $('#remove-contact')?.addEventListener('click', () => {
    state.contacts = state.contacts.filter((c) => c.id !== personId);
    store.set('contacts', state.contacts);
    closeSheet();
    renderCampus();
  });
  sheet.querySelectorAll('[data-open-place]').forEach((b) => b.addEventListener('click', () => selectPlace(b.dataset.openPlace)));
  sheet.querySelectorAll('[data-open-person]').forEach((b) => b.addEventListener('click', () => openPerson(b.dataset.openPerson)));
  if (route) drawRoute(p, $('#route-from').value);
  if (p.menu) renderMenuPreview(p.menu);
}

const saveLabel = (saved) => `${saved ? '★' : '☆'} <span class="btn-label">${esc(t(saved ? 'sheet.saved' : 'sheet.save'))}</span>`;

function openPerson(personId) {
  const person = personById(personId);
  if (!person) return;
  const room = locateRoom(person.room, state.campus);
  const building = room?.buildingRef ?? locateBuilding(person.room, state.campus);
  if (building) selectPlace(building.id, { room, personId });
}

async function share(title, query) {
  const url = `${location.origin}${location.pathname}?q=${encodeURIComponent(query)}`;
  try {
    if (navigator.share) return await navigator.share({ title: `${title} – HSWT Navigator`, url });
    await navigator.clipboard.writeText(url);
    toast(t('sheet.copied'));
  } catch {
    /* share sheet dismissed */
  }
}

async function drawRoute(place, originValue) {
  const id = ++routeRequest;
  state.selected.routed = true;
  const target = place.kind === 'service' ? buildingById(place.building) ?? place : place;
  const origin = resolveOrigin(originValue);
  $('#route-summary').innerHTML = `<div class="route-summary">${esc(t('route.loading'))}</div>`;

  const route = await routeFor(origin, target.latlng, target.id).promise;
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
    const line = L.polyline(route.coords, { color: '#00653a', weight: 6, opacity: 0.85, dashArray: route.approx ? '8 10' : null }).addTo(routeLayer);
    const sheet = $('#sheet');
    const wide = isTouchWide();
    map.fitBounds(line.getBounds(), {
      paddingTopLeft: [wide ? sheet.offsetWidth + 40 : 30, 130],
      paddingBottomRight: [30, wide ? 30 : sheet.offsetHeight + 30],
      maxZoom: 18,
    });
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
$('#sheet-handle').addEventListener('click', () => $('#sheet').classList.toggle('collapsed'));

// ---------- welcome ----------

function showWelcome() {
  $('#welcome').hidden = false;
}
$('#welcome-ok').addEventListener('click', () => {
  $('#welcome').hidden = true;
  store.set('welcomeSeen', true);
  input.focus();
});
$('#reset-welcome').addEventListener('click', () => {
  showView('map');
  showWelcome();
});

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
        const near = nearest(places().filter((p) => !['transit', 'service'].includes(p.kind)), state.me);
        toast(near && near.meters < NEAR_PLACE_RADIUS_M ? t('toast.near', { name: i18n.pick(near.item.name) }) : t('toast.notOnCampus'));
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

const CHIPS = [
  { key: 'chip.mensa', icon: '🍴', place: 'mensa' },
  { key: 'chip.library', icon: '📚', place: 'library' },
  { key: 'chip.tumLibrary', icon: '📖', place: 'tum-library' },
  { key: 'chip.studentService', icon: '🎓', place: 'student-service' },
  { key: 'chip.cafe', icon: '☕', query: 'StuCafé' },
  { key: 'chip.station', icon: '🚆', query: 'Freising Bahnhof' },
  { key: 'chip.people', icon: '👩‍🏫', view: 'people' },
];

function renderChips() {
  $('#chips').innerHTML = CHIPS.map((c, i) => `<button class="chip" data-chip="${i}"><span aria-hidden="true">${c.icon}</span> ${esc(t(c.key))}</button>`).join('');
}

$('#chips').addEventListener('click', (e) => {
  const chip = CHIPS[e.target.closest('[data-chip]')?.dataset.chip];
  if (!chip) return;
  if (chip.place) return selectPlace(chip.place);
  if (chip.view === 'people') {
    showView('campus');
    return $('#people-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  input.value = chip.query;
  runSearch();
  if (results.length === 1 || results[0]?.score >= 100) pickResult(results[0]);
});

function runSearch() {
  const q = input.value;
  $('#search-clear').hidden = !q;
  if (!q.trim()) return showSuggestions();
  results = search(q, { campus: state.campus, places: places(), classes: state.classes, contacts: state.contacts, i18n });
  activeIdx = results.length ? 0 : -1;
  renderResults(results.length ? '' : `<li class="empty">${esc(t('search.none'))}</li>`);
}

// Empty search box: offer saved places and recent searches.
function showSuggestions() {
  const asResult = (entry) => {
    const { title, sub } = storedLabel(entry);
    return { title, subtitle: sub, stored: entry };
  };
  const saved = state.saved.map(asResult);
  const recent = state.recent.filter((r) => !state.saved.some((s) => s.key === r.key)).map(asResult);
  results = [...saved, ...recent].filter((r) => r.title);
  activeIdx = -1;
  const header = (key, n) => (n ? `<li class="group" role="presentation">${esc(t(key))}</li>` : '');
  resultsEl.hidden = results.length === 0;
  resultsEl.innerHTML =
    header('search.favorites', saved.length) +
    results
      .map((r, i) => (i === saved.length ? header('search.recent', recent.length) : '') + resultItem(r, i, i < saved.length ? '★ ' : '↺ '))
      .join('');
}

function resultItem(r, i, prefix = '') {
  return `<li role="option" data-i="${i}" aria-selected="${i === activeIdx}">
    <div class="title">${esc(prefix)}${esc(r.title)}</div>
    <div class="sub">${esc(r.subtitle ?? '')}</div>
  </li>`;
}

function renderResults(empty = '') {
  resultsEl.hidden = !results.length && !empty;
  resultsEl.innerHTML = results.map((r, i) => resultItem(r, i)).join('') || empty;
}

function hideResults() {
  results = [];
  resultsEl.hidden = true;
}

function pickResult(r) {
  hideResults();
  input.blur();
  if (r.stored) {
    input.value = r.title;
    return openStored(r.stored);
  }
  input.value = r.title;
  if (!r.placeId) return toast(t('toast.classNoRoom'));
  selectPlace(r.placeId, { room: r.room ?? null, personId: r.personId ?? null });
}

input.addEventListener('input', runSearch);
input.addEventListener('focus', () => !input.value && showSuggestions());
input.addEventListener('blur', () => setTimeout(() => document.activeElement !== input && (resultsEl.hidden = true), 200));
input.addEventListener('keydown', (e) => {
  if (!results.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    resultsEl.querySelectorAll('li[data-i]').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === activeIdx)));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    pickResult(results[Math.max(0, activeIdx)]);
  } else if (e.key === 'Escape') {
    hideResults();
  }
});
resultsEl.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus so blur doesn't hide first
resultsEl.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-i]');
  if (li) pickResult(results[Number(li.dataset.i)]);
});
$('#search-clear').addEventListener('click', () => {
  input.value = '';
  $('#search-clear').hidden = true;
  input.focus();
  showSuggestions();
});

// ---------- Mensa ----------

const menuCache = new Map();
// GitHub Pages first; the raw gh-pages branch is a fallback for networks that block github.io.
function loadWeek(canteenId, date) {
  const url = menuUrl(canteenId, date);
  if (!menuCache.has(url)) {
    const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error(`HTTP ${r.status}`))));
    const raw = url.replace(EAT_API, 'https://raw.githubusercontent.com/TUM-Dev/eat-api/gh-pages');
    const p = get(url).catch(() => get(raw));
    p.catch(() => menuCache.delete(url));
    menuCache.set(url, p);
  }
  return menuCache.get(url);
}

const mensaPlace = () => placeById('mensa');

function dietBadge(dish) {
  if (!dish.diet) return '';
  const icon = { vegan: '🌱', vegetarian: '🥕', fish: '🐟', meat: dish.meat.map((m) => LABELS[m]?.icon).filter(Boolean).join('') || '🍖' }[dish.diet];
  return `<span class="diet diet-${dish.diet}">${icon} ${esc(t(`mensa.dietLabel.${dish.diet}`))}</span>`;
}

function labelNames(keys) {
  return keys.map((k) => i18n.pick(LABELS[k])).filter(Boolean);
}

function dishCard(dish) {
  const hits = conflicts(dish, state.mensa.avoid);
  const price = formatPrice(dish.prices[state.mensa.role], i18n.locale);
  const details = [
    dish.allergens.length ? `<div><strong>${esc(t('mensa.allergens'))}:</strong> ${esc(labelNames(dish.allergens).join(', '))}</div>` : '',
    dish.additives.length ? `<div><strong>${esc(t('mensa.additives'))}:</strong> ${esc(labelNames(dish.additives).join(', '))}</div>` : '',
    dish.quality.length ? `<div><strong>${esc(t('mensa.quality'))}:</strong> ${esc(labelNames(dish.quality).join(', '))}</div>` : '',
  ].join('');
  return `<li class="dish ${hits.length ? 'conflict' : ''}">
    <div class="dish-main">
      <div class="dish-name">${esc(dish.name)}</div>
      <div class="dish-price">${esc(price || '–')}</div>
    </div>
    <div class="dish-meta">${dietBadge(dish)}${hits.length ? `<span class="warn">${esc(t('mensa.warn', { list: hits.map((f) => i18n.pick(ALLERGEN_FAMILIES[f])).join(', ') }))}</span>` : ''}</div>
    ${details ? `<details class="dish-details"><summary>${esc(t('mensa.details'))}</summary>${details}</details>` : ''}
  </li>`;
}

async function renderMensa() {
  const m = state.mensa;
  const place = mensaPlace();
  const status = openingStatus(place.hours);
  $('#mensa-status').className = `status ${statusClass(status)}`;
  $('#mensa-status').textContent = `${place.name} · ${i18n.openingStatus(status)}`;
  $('#mensa-diet').innerHTML = DIETS.map(
    (d) => `<button type="button" data-diet="${d}" aria-pressed="${m.diet === d}">${esc(t(`mensa.diet.${d}`))}</button>`,
  ).join('');
  $('#mensa-role').innerHTML = ROLES.map((r) => `<option value="${r}" ${r === m.role ? 'selected' : ''}>${esc(t(`mensa.role.${r}`))}</option>`).join('');
  $('#allergen-picker').innerHTML = Object.entries(ALLERGEN_FAMILIES)
    .map(([k, v]) => `<label><input type="checkbox" value="${k}" ${m.avoid.includes(k) ? 'checked' : ''}/> ${esc(i18n.pick(v))}</label>`)
    .join('');
  $('#hide-conflicts').checked = m.hide;

  const today = new Date();
  const start = menuWeekStart(today);
  start.setDate(start.getDate() + 7 * m.week);
  const list = $('#mensa-list');
  list.innerHTML = `<p class="muted">${esc(t('mensa.loading'))}</p>`;
  let week;
  try {
    week = await loadWeek(place.menu, start);
  } catch {
    list.innerHTML = `<p class="muted">${esc(t('mensa.error'))}</p>`;
    return;
  }
  const days = daysOf(week);
  const todayIso = isoDate(today);
  if (!m.day || !days.some((d) => d.date === m.day)) m.day = days.find((d) => d.date >= todayIso)?.date ?? days[0]?.date ?? null;

  const tabs = days.map((d) => {
    const date = new Date(`${d.date}T12:00`);
    const label = `${i18n.weekday(date.getDay(), true)} ${i18n.shortDate(date)}${d.date === todayIso ? ` · ${t('mensa.today')}` : ''}`;
    return `<button role="tab" data-day="${d.date}" aria-selected="${d.date === m.day}">${esc(label)}</button>`;
  });
  tabs.push(`<button class="week-toggle" data-week="${m.week ? 0 : 1}">${esc(t(m.week ? 'mensa.thisWeek' : 'mensa.nextWeek'))} ${m.week ? '←' : '→'}</button>`);
  $('#mensa-days').innerHTML = tabs.join('');

  const day = days.find((d) => d.date === m.day);
  if (!day || !day.dishes.length) {
    list.innerHTML = `<p class="muted">${esc(t('mensa.none'))}</p>`;
    return;
  }
  const visible = day.dishes.filter((d) => matchesDiet(d, m.diet) && !(m.hide && conflicts(d, m.avoid).length));
  list.innerHTML = visible.length
    ? groupByType(visible)
        .map((g) => `<h3 class="dish-type">${esc(g.type)}</h3><ul class="dishes">${g.dishes.map(dishCard).join('')}</ul>`)
        .join('')
    : `<p class="muted">${esc(t('mensa.noMatch'))}</p>`;
}

$('#mensa-days').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.week) {
    state.mensa.week = Number(b.dataset.week);
    state.mensa.day = null;
  } else state.mensa.day = b.dataset.day;
  renderMensa();
});
$('#mensa-diet').addEventListener('click', (e) => {
  const d = e.target.closest('[data-diet]')?.dataset.diet;
  if (!d) return;
  state.mensa.diet = d;
  store.set('mensaDiet', d);
  renderMensa();
});
$('#mensa-role').addEventListener('change', (e) => {
  state.mensa.role = e.target.value;
  store.set('mensaRole', state.mensa.role);
  renderMensa();
});
$('#allergen-picker').addEventListener('change', () => {
  state.mensa.avoid = [...document.querySelectorAll('#allergen-picker input:checked')].map((i) => i.value);
  store.set('allergens', state.mensa.avoid);
  renderMensa();
});
$('#hide-conflicts').addEventListener('change', (e) => {
  state.mensa.hide = e.target.checked;
  store.set('hideConflicts', state.mensa.hide);
  renderMensa();
});
$('#mensa-map').addEventListener('click', () => selectPlace('mensa'));

async function todaysDishes() {
  const place = mensaPlace();
  try {
    return daysOf(await loadWeek(place.menu, new Date())).find((d) => d.date === isoDate(new Date()))?.dishes ?? [];
  } catch {
    return null;
  }
}

async function renderMenuPreview() {
  const dishes = await todaysDishes();
  const el = $('#menu-preview');
  if (!el) return;
  if (!dishes) return (el.textContent = t('mensa.error'));
  if (!dishes.length) return (el.textContent = t('sheet.menuNone'));
  el.classList.remove('muted');
  el.innerHTML = `<ul class="mini-list">${dishes
    .slice(0, 5)
    .map((d) => `<li>${esc(d.name)} <span class="muted">${esc(formatPrice(d.prices[state.mensa.role], i18n.locale))}</span></li>`)
    .join('')}</ul><button class="btn" id="full-menu">${esc(t('sheet.fullMenu'))} →</button>`;
  $('#full-menu').addEventListener('click', () => showView('mensa'));
}

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
    if (target) where = [target.loc ? t('room.title', { code: target.loc.code }) : '', i18n.pick(target.building.name), target.building.address].filter(Boolean).join(' · ');
    card.innerHTML = `
      <div class="muted">${esc(ongoing ? t('today.current') : t('today.next'))}</div>
      <div class="big">${esc(entry.title)}</div>
      <div>${esc(when)}</div>
      <div class="muted">${esc(where)}</div>
      ${leaveText ? `<div style="margin-top:6px">${leaveText}</div>` : ''}
      ${target ? `<div class="actions"><button class="btn" id="nav-next">${esc(t('today.navigate'))}</button></div>` : ''}`;
    $('#nav-next')?.addEventListener('click', () => selectPlace(target.building.id, { room: target.loc, route: true }));
  }

  renderLunch(now);

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

// On weekdays before the Mensa closes, suggest today's cheapest dish.
let lunchShownFor = null;
async function renderLunch(now) {
  const card = $('#lunch-card');
  const status = openingStatus(mensaPlace().hours, now);
  const before = status.open || (status.opensIn === 0 && status.opensAt);
  if (!before) return (card.hidden = true);
  const key = `${isoDate(now)}|${state.lang}|${state.mensa.role}`;
  if (lunchShownFor === key) return;
  lunchShownFor = key;
  const dishes = (await todaysDishes())?.filter((d) => matchesDiet(d, state.mensa.diet) && !conflicts(d, state.mensa.avoid).length);
  if (!dishes?.length) return (card.hidden = true);
  const cheapest = [...dishes].sort((a, b) => (a.prices[state.mensa.role]?.base_price ?? 99) - (b.prices[state.mensa.role]?.base_price ?? 99))[0];
  card.hidden = false;
  card.innerHTML = `🍴 ${esc(t('today.lunch', { dish: `${cheapest.name} (${formatPrice(cheapest.prices[state.mensa.role], i18n.locale)})` }))}
    <div class="actions"><button class="btn" data-go="mensa">${esc(t('sheet.fullMenu'))}</button></div>`;
  card.querySelector('[data-go]').addEventListener('click', () => showView('mensa'));
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

function placeItem(p, { badge, status, sub } = {}) {
  return `<li class="item clickable" data-place="${esc(p.id)}">
    <span class="badge">${esc(badge ?? p.id)}</span>
    <div class="grow"><div class="title">${esc(i18n.pick(p.name))}</div>
    <div class="sub">${esc(sub ?? i18n.pick(p.description) ?? '')}</div>
    ${status?.known ? `<div class="status ${statusClass(status)}">${esc(i18n.openingStatus(status))}</div>` : ''}</div>
  </li>`;
}

function personItem(p) {
  return `<li class="item clickable" data-person="${esc(p.id)}">
    <span class="badge">${esc(p.room.split('.')[0])}</span>
    <div class="grow"><div class="title">${esc(p.name)}</div><div class="sub">${esc([p.room, i18n.pick(p.field) || i18n.pick(p.note)].filter(Boolean).join(' · '))}</div></div>
  </li>`;
}

function renderCampus() {
  const now = new Date();
  $('#saved-list').innerHTML = state.saved.length
    ? state.saved
        .map((s, i) => {
          const { title, sub } = storedLabel(s);
          return title ? `<li class="item clickable" data-saved="${i}"><span class="badge">★</span><div class="grow"><div class="title">${esc(title)}</div><div class="sub">${esc(sub)}</div></div></li>` : '';
        })
        .join('')
    : `<li class="muted small">${esc(t('campus.savedEmpty'))}</li>`;

  $('#services-list').innerHTML = state.campus.pois
    .filter((p) => p.kind === 'service' || p.kind === 'study')
    .map((p) => placeItem(p, { badge: p.building ?? GLYPH[p.kind], status: openingStatus(p.hours, now), sub: [p.room, i18n.pick(p.description)].filter(Boolean).join(' · ') }))
    .join('');
  $('#food-list').innerHTML = state.campus.pois
    .filter((p) => p.kind === 'food')
    .map((p) => ({ p, status: openingStatus(p.hours, now) }))
    .sort((a, b) => Number(!!b.status.open) - Number(!!a.status.open))
    .map(({ p, status }) => placeItem(p, { badge: GLYPH.food, status }))
    .join('');

  $('#people-list').innerHTML = Object.entries(FACULTIES)
    .map(([key, name]) => {
      const people = state.campus.people.filter((p) => p.faculty === key);
      return people.length
        ? `<details class="card people-group"><summary>${esc(i18n.pick(name))} <span class="muted">(${people.length})</span></summary><ul class="list">${people.map(personItem).join('')}</ul></details>`
        : '';
    })
    .join('');
  $('#contacts-list').innerHTML = state.contacts.map(personItem).join('');

  $('#buildings-list').innerHTML = state.campus.buildings
    .map(
      (b) => `<li class="item clickable" data-place="${esc(b.id)}">
        <span class="badge">${esc(b.id)}</span><div class="grow"><div class="title">${esc(i18n.pick(b.subtitle) || i18n.pick(b.name))}</div>${
          b.address ? `<div class="sub">${esc(b.address.replace(', 85354 Freising', ''))}</div>` : ''
        }</div>
      </li>`,
    )
    .join('');
}

$('#view-campus').addEventListener('click', (e) => {
  const el = e.target.closest('[data-place],[data-person],[data-saved]');
  if (!el) return;
  if (el.dataset.place) selectPlace(el.dataset.place);
  else if (el.dataset.person) openPerson(el.dataset.person);
  else openStored(state.saved[Number(el.dataset.saved)]);
});

$('#contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const input = f.get('room').trim();
  const loc = locateRoom(input, state.campus);
  const building = loc?.buildingRef ?? locateBuilding(input, state.campus);
  if (!building) return toast(t('contact.badRoom', { room: input }));
  // Store the official spelling ("d1 436" → "D1.436") so it matches the profile pages.
  const contact = { id: `contact-${Date.now()}`, name: f.get('name').trim(), room: loc?.code ?? building.id, note: f.get('note').trim() };
  state.contacts.push(contact);
  store.set('contacts', state.contacts);
  e.target.reset();
  renderCampus();
  toast(t('toast.contactSaved', { name: contact.name }));
});

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
  hideResults();
  if (map) fitCampus();
  applyLanguage();
});

// ---------- boot ----------

applyTheme();
initMap();
applyLanguage();
locate({ quiet: true });
setInterval(() => {
  if ($('#view-today').classList.contains('active')) renderToday();
}, 30000);

// Deep links: ?q=A6.301 or ?q=Laube opens the room / person directly (e.g. from a QR code on a door sign).
const q = new URLSearchParams(location.search).get('q');
if (q) {
  const hit = search(q, { campus: state.campus, places: places(), classes: state.classes, contacts: state.contacts, i18n })[0];
  if (hit) pickResult(hit);
} else if (!store.get('welcomeSeen', false)) {
  showWelcome();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
