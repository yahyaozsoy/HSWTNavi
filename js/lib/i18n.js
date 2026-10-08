// UI translations (German / English) and locale-aware formatting.

export const LANGUAGES = ['de', 'en'];

const STRINGS = {
  de: {
    'app.title': 'HSWT Navigator',
    'tab.map': 'Karte',
    'tab.today': 'Heute',
    'tab.campus': 'Campus',
    'search.placeholder': 'Raum (z. B. A6 1.12), Gebäude, Mensa, Bus …',
    'search.label': 'Campus durchsuchen',
    'locate.title': 'Meinen Standort zeigen',
    'close': 'Schließen',

    'kind.building': 'Gebäude',
    'kind.food': 'Essen',
    'kind.transit': 'Haltestelle',
    'kind.residence': 'Wohnheim',
    'kind.service': 'Einrichtung',
    'kind.parking': 'Parkplatz',
    'kind.class': 'Deine Lehrveranstaltung',

    'building.name': 'Gebäude {code}',
    'building.generic': 'HSWT-Gebäude',
    'room.title': 'Raum {code}',
    'room.floorUnknown': '(Stockwerk nicht hinterlegt)',
    'floor.ground': 'Erdgeschoss',
    'floor.basement': 'Untergeschoss',
    'floor.basementN': '{n}. Untergeschoss',
    'floor.upper': '{n}. Obergeschoss',

    'status.open': 'Geöffnet · bis {time} Uhr',
    'status.closedOpens': 'Geschlossen · öffnet {day} {time} Uhr',
    'status.closed': 'Geschlossen',
    'day.today': 'heute',
    'day.tomorrow': 'morgen',

    'route.from': 'Start',
    'route.go': 'Route hierher',
    'route.myLocation': 'Mein Standort',
    'route.station': 'Bahnhof Freising',
    'route.loading': 'Route wird berechnet …',
    'route.summary': '{min} Min. zu Fuß · {dist}',
    'route.stepFree': 'Barrierefreie Route (ohne Treppen)',
    'route.approx': 'Offline-Schätzung (Luftlinie) – keine Verbindung zum Routing-Dienst.',
    'route.osrmFallback': 'Ersatz-Routing ohne Barrierefrei-Option.',
    'route.farAway': 'Du bist nicht in Freising – die Route startet am Bahnhof Freising.',
    'route.steps': 'Wegbeschreibung',
    'route.attribution': 'Routing: {provider} · Daten © OpenStreetMap',
    'route.none': 'Keine Route gefunden.',

    'sheet.menu': 'Speiseplan heute',
    'sheet.menuLoading': 'Speiseplan wird geladen …',
    'sheet.menuNone': 'Für heute ist kein Speiseplan veröffentlicht.',
    'sheet.menuError': 'Speiseplan nicht erreichbar.',
    'sheet.hoursSource': 'Öffnungszeiten laut Studierendenwerk (eat-api)',
    'sheet.notStepFree': '⚠ Barrierefreiheit nicht bestätigt – im Zweifel beim Gebäudeservice nachfragen.',
    'sheet.departures': 'Abfahrten',

    'today.next': 'Nächste Veranstaltung',
    'today.current': 'Aktuelle Veranstaltung',
    'today.none': 'Diese Woche keine weiteren Veranstaltungen 🎉',
    'today.emptyTitle': 'Stundenplan hinzufügen',
    'today.emptyText': 'Importiere eine .ics-Datei oder trage Veranstaltungen ein – der Navigator sagt dir, wohin und wann du losmusst.',
    'today.nowUntil': 'Jetzt · bis {time} Uhr',
    'today.leaveNow': 'Jetzt losgehen!',
    'today.leaveBy': 'Losgehen um <strong>{time}</strong>',
    'today.walk': '{min} Min. Fußweg {from}',
    'today.fromHere': 'von hier',
    'today.fromStation': 'vom Bahnhof',
    'today.navigate': 'Navigieren',
    'today.noRoom': 'Kein Raum angegeben',
    'today.roomUnknown': 'Raum „{room}“ ist nicht auf dem Lageplan',
    'today.heading': 'Heute',
    'today.nothing': 'Heute steht nichts an.',
    'today.until': 'bis {time}',
    'timetable.heading': 'Mein Stundenplan',
    'timetable.empty': 'Noch keine Veranstaltungen.',
    'timetable.remove': '{title} entfernen',
    'form.add': 'Veranstaltung hinzufügen',
    'form.course': 'Veranstaltung',
    'form.room': 'Raum',
    'form.day': 'Tag',
    'form.from': 'Von',
    'form.to': 'Bis',
    'form.submit': 'Hinzufügen',
    'form.endBeforeStart': 'Das Ende muss nach dem Beginn liegen.',
    'form.roomNotFound': 'Raum „{room}“ ist nicht auf dem Lageplan – trotzdem gespeichert.',
    'ics.heading': 'Stundenplan importieren (.ics)',
    'ics.help': 'Exportiere deinen Stundenplan als iCalendar-Datei (z. B. aus PRIMUSS oder deiner Kalender-App) und importiere ihn hier. Alles bleibt auf diesem Gerät.',
    'ics.imported': '{n} Veranstaltung(en) importiert.',
    'ics.none': 'Keine Termine in dieser Datei gefunden.',

    'campus.openNow': 'Essen & Trinken',
    'campus.services': 'Einrichtungen & Dekanate',
    'campus.buildings': 'Alle Gebäude',
    'campus.settings': 'Einstellungen',
    'settings.stepFree': 'Barrierefreie Routen (ohne Treppen)',
    'settings.buffer': 'Minuten früher ankommen',
    'settings.language': 'Sprache',
    'about.data':
      'Gebäude: offizieller HSWT-Lageplan, georeferenziert (typische Abweichung ca. {err} m). Karte & Wege © OpenStreetMap-Mitwirkende. Routing: FOSSGIS Valhalla/OSRM. Haltestellen: DELFI/MVV. Mensa: Studierendenwerk via TUM-Dev eat-api.',

    'toast.near': 'Du bist bei {name}',
    'toast.notOnCampus': 'Du bist gerade nicht auf dem Campus.',
    'toast.noGeo': 'Standort ist auf diesem Gerät nicht verfügbar.',
    'toast.geoDenied': 'Standort nicht verfügbar – bitte Berechtigung prüfen.',
    'toast.classNoRoom': 'Für diese Veranstaltung ist kein Raum auf dem Campus hinterlegt.',
    'map.offline': 'Karte offline nicht verfügbar. Suche und Stundenplan funktionieren trotzdem.',
    'countdown.now': 'jetzt',
    'countdown.min': 'in {n} Min.',
    'countdown.hours': 'in {h} Std.',
    'countdown.hoursMin': 'in {h} Std. {m} Min.',
    'countdown.tomorrow': 'morgen',
    'countdown.days': 'in {n} Tagen',
  },
  en: {
    'app.title': 'HSWT Navigator',
    'tab.map': 'Map',
    'tab.today': 'Today',
    'tab.campus': 'Campus',
    'search.placeholder': 'Room (e.g. A6 1.12), building, Mensa, bus …',
    'search.label': 'Search campus',
    'locate.title': 'Show my location',
    'close': 'Close',

    'kind.building': 'Building',
    'kind.food': 'Food',
    'kind.transit': 'Bus stop',
    'kind.residence': 'Residence hall',
    'kind.service': 'Facility',
    'kind.parking': 'Car park',
    'kind.class': 'Your class',

    'building.name': 'Building {code}',
    'building.generic': 'HSWT building',
    'room.title': 'Room {code}',
    'room.floorUnknown': '(floor not on record)',
    'floor.ground': 'ground floor',
    'floor.basement': 'basement',
    'floor.basementN': 'basement {n}',
    'floor.upper': '{n}{suffix} floor',

    'status.open': 'Open · closes {time}',
    'status.closedOpens': 'Closed · opens {day} {time}',
    'status.closed': 'Closed',
    'day.today': 'today',
    'day.tomorrow': 'tomorrow',

    'route.from': 'From',
    'route.go': 'Route here',
    'route.myLocation': 'My location',
    'route.station': 'Freising station',
    'route.loading': 'Calculating route …',
    'route.summary': '{min} min walk · {dist}',
    'route.stepFree': 'Step-free route (no stairs)',
    'route.approx': 'Offline estimate (straight line) – routing service unreachable.',
    'route.osrmFallback': 'Fallback routing without step-free option.',
    'route.farAway': "You're not in Freising – the route starts at Freising station.",
    'route.steps': 'Directions',
    'route.attribution': 'Routing: {provider} · Data © OpenStreetMap',
    'route.none': 'No route found.',

    'sheet.menu': "Today's menu",
    'sheet.menuLoading': 'Loading menu …',
    'sheet.menuNone': 'No menu published for today.',
    'sheet.menuError': 'Menu unavailable.',
    'sheet.hoursSource': 'Opening hours from Studierendenwerk (eat-api)',
    'sheet.notStepFree': '⚠ Step-free access not confirmed – check with building services if in doubt.',
    'sheet.departures': 'Departures',

    'today.next': 'Next class',
    'today.current': 'Current class',
    'today.none': 'No more classes this week 🎉',
    'today.emptyTitle': 'Add your timetable',
    'today.emptyText': 'Import an .ics file or add classes below – the navigator tells you where to go and when to leave.',
    'today.nowUntil': 'Now · until {time}',
    'today.leaveNow': 'Leave now!',
    'today.leaveBy': 'Leave by <strong>{time}</strong>',
    'today.walk': '{min} min walk {from}',
    'today.fromHere': 'from here',
    'today.fromStation': 'from the station',
    'today.navigate': 'Navigate',
    'today.noRoom': 'No room set',
    'today.roomUnknown': 'Room "{room}" is not on the site plan',
    'today.heading': 'Today',
    'today.nothing': 'Nothing scheduled today.',
    'today.until': 'until {time}',
    'timetable.heading': 'My timetable',
    'timetable.empty': 'No classes yet.',
    'timetable.remove': 'Remove {title}',
    'form.add': 'Add a class',
    'form.course': 'Course',
    'form.room': 'Room',
    'form.day': 'Day',
    'form.from': 'From',
    'form.to': 'To',
    'form.submit': 'Add class',
    'form.endBeforeStart': 'End time must be after start time.',
    'form.roomNotFound': 'Room "{room}" is not on the site plan – saved anyway.',
    'ics.heading': 'Import timetable (.ics)',
    'ics.help': 'Export your timetable as an iCalendar file (e.g. from PRIMUSS or your calendar app) and import it here. Everything stays on this device.',
    'ics.imported': 'Imported {n} class(es).',
    'ics.none': 'No events found in that file.',

    'campus.openNow': 'Food & drink',
    'campus.services': 'Facilities & dean’s offices',
    'campus.buildings': 'All buildings',
    'campus.settings': 'Settings',
    'settings.stepFree': 'Step-free routes (avoid stairs)',
    'settings.buffer': 'Minutes to arrive early',
    'settings.language': 'Language',
    'about.data':
      'Buildings: official HSWT site plan, georeferenced (typical error approx. {err} m). Map & paths © OpenStreetMap contributors. Routing: FOSSGIS Valhalla/OSRM. Stops: DELFI/MVV. Mensa: Studierendenwerk via TUM-Dev eat-api.',

    'toast.near': "You're near {name}",
    'toast.notOnCampus': "You're not on campus right now.",
    'toast.noGeo': 'Location is not available on this device.',
    'toast.geoDenied': 'Could not get your location. Check location permissions.',
    'toast.classNoRoom': 'This class has no room on campus yet.',
    'map.offline': 'Map unavailable offline. Search and timetable still work.',
    'countdown.now': 'now',
    'countdown.min': 'in {n} min',
    'countdown.hours': 'in {h} h',
    'countdown.hoursMin': 'in {h} h {m} min',
    'countdown.tomorrow': 'tomorrow',
    'countdown.days': 'in {n} days',
  },
};

export function detectLanguage(stored, navigatorLanguages = []) {
  if (LANGUAGES.includes(stored)) return stored;
  for (const l of navigatorLanguages) {
    const base = String(l).slice(0, 2).toLowerCase();
    if (LANGUAGES.includes(base)) return base;
  }
  return 'de';
}

export function createI18n(lang) {
  const dict = STRINGS[lang] ?? STRINGS.de;
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  function t(key, params = {}) {
    const template = dict[key] ?? STRINGS.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  }

  // Pick the right language from a { de, en } object (or pass strings through).
  const pick = (value) => (value && typeof value === 'object' ? value[lang] ?? value.de ?? value.en : value ?? '');

  const ordinal = (n) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  function floor(n) {
    if (n === 0) return t('floor.ground');
    if (n === -1) return t('floor.basement');
    if (n < 0) return t('floor.basementN', { n: -n });
    return t('floor.upper', { n, suffix: ordinal(n) });
  }

  function countdown(ms) {
    const totalMin = Math.round(ms / 60000);
    if (totalMin <= 0) return t('countdown.now');
    if (totalMin < 60) return t('countdown.min', { n: totalMin });
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h < 24) return m ? t('countdown.hoursMin', { h, m }) : t('countdown.hours', { h });
    const days = Math.round(h / 24);
    return days === 1 ? t('countdown.tomorrow') : t('countdown.days', { n: days });
  }

  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const weekdayShortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2026-10-04 is a Sunday; index 0 = Sunday like Date#getDay().
  const weekday = (d, short = false) => (short ? weekdayShortFmt : weekdayFmt).format(new Date(2026, 9, 4 + d));

  function openingStatus(status) {
    if (!status.known) return '';
    if (status.open) return t('status.open', { time: status.closesAt });
    if (status.opensAt) {
      const day =
        status.opensIn === 0 ? t('day.today') : status.opensIn === 1 ? t('day.tomorrow') : weekday(status.opensDay, true);
      return t('status.closedOpens', { day, time: status.opensAt });
    }
    return t('status.closed');
  }

  const time = (d) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const distance = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`);

  return { lang, locale, t, pick, floor, countdown, weekday, openingStatus, time, distance };
}
