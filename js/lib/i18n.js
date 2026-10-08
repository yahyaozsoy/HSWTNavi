// UI translations (German / English) and locale-aware formatting.

export const LANGUAGES = ['de', 'en'];

const STRINGS = {
  de: {
    'app.title': 'HSWT Navigator',
    'tab.map': 'Karte',
    'tab.today': 'Heute',
    'tab.mensa': 'Mensa',
    'tab.campus': 'Campus',
    'search.placeholder': 'Raum (z. B. A6.301), Person, Mensa …',
    'search.label': 'Campus durchsuchen',
    'search.clear': 'Suche löschen',
    'search.recent': 'Zuletzt gesucht',
    'search.favorites': 'Gemerkt',
    'search.none': 'Nichts gefunden. Tipp: Raumnummer wie „D1.436“ oder einen Nachnamen eingeben.',
    'locate.title': 'Meinen Standort zeigen',
    'close': 'Schließen',

    'chip.mensa': 'Mensa',
    'chip.library': 'Bibliothek',
    'chip.tumLibrary': 'TUM-Bibliothek (bis 24 Uhr)',
    'chip.studentService': 'Student.Service',
    'chip.cafe': 'Café',
    'chip.station': 'Bahnhof',
    'chip.people': 'Professor:innen',

    'kind.building': 'Gebäude',
    'kind.food': 'Essen & Trinken',
    'kind.transit': 'Haltestelle',
    'kind.residence': 'Wohnheim',
    'kind.service': 'Einrichtung',
    'kind.study': 'Lernen & Bibliothek',
    'kind.community': 'Gemeinde',
    'kind.parking': 'Parkplatz',
    'kind.person': 'Büro',
    'kind.contact': 'Mein Kontakt',
    'kind.class': 'Deine Lehrveranstaltung',
    'kind.room': 'Raum',

    'room.title': 'Raum {code}',
    'room.hint': 'Raum {room} liegt im Gebäude {building}. Die Raumnummern stehen an den Türen; im Gebäude hängen Übersichtspläne.',

    'status.open': 'Geöffnet · bis {time} Uhr',
    'status.closedOpens': 'Geschlossen · öffnet {day} {time} Uhr',
    'status.closed': 'Geschlossen',
    'day.today': 'heute',
    'day.tomorrow': 'morgen',

    'route.from': 'Start',
    'route.go': 'Route hierher',
    'route.myLocation': 'Mein Standort',
    'route.station': 'Bahnhof Freising',
    'route.group.start': 'Startpunkt',
    'route.group.buildings': 'Gebäude',
    'route.group.other': 'Weitere Orte',
    'route.loading': 'Route wird berechnet …',
    'route.summary': '{min} Min. zu Fuß · {dist}',
    'route.stepFree': 'Barrierefreie Route (ohne Treppen)',
    'route.approx': 'Offline-Schätzung (Luftlinie) – keine Verbindung zum Routing-Dienst.',
    'route.osrmFallback': 'Ersatz-Routing ohne Barrierefrei-Option.',
    'route.farAway': 'Du bist nicht in Freising – die Route startet am Bahnhof Freising.',
    'route.steps': 'Wegbeschreibung',
    'route.attribution': 'Routing: {provider} · Daten © OpenStreetMap',
    'route.none': 'Keine Route gefunden.',
    'route.arrive': 'Ziel: {target}',

    'sheet.address': 'Adresse',
    'sheet.room': 'Raum',
    'sheet.hours': 'Öffnungszeiten',
    'sheet.phone': 'Telefon',
    'sheet.email': 'E-Mail',
    'sheet.website': 'Mehr auf hswt.de',
    'sheet.websiteOther': 'Website',
    'sheet.note': 'Hinweis',
    'sheet.profile': 'Profil & Sprechzeiten auf hswt.de',
    'sheet.share': 'Teilen',
    'sheet.copied': 'Link kopiert',
    'sheet.save': 'Merken',
    'sheet.saved': 'Gemerkt',
    'sheet.inside': 'Hier zu finden',
    'sheet.people': 'Büros in diesem Gebäude',
    'sheet.source': 'Quelle: hswt.de, Stand {date}',
    'sheet.positionPlan': 'Lage nach HSWT-Lageplan (kein OpenStreetMap-Umriss vorhanden).',
    'sheet.hoursSource': 'Öffnungszeiten laut Studierendenwerk (eat-api)',
    'sheet.todayMenu': 'Heute in der Mensa',
    'sheet.fullMenu': 'Ganzer Speiseplan',
    'sheet.menuNone': 'Heute kein Speiseplan veröffentlicht.',
    'sheet.removeContact': 'Kontakt löschen',

    'mensa.title': 'Speiseplan',
    'mensa.loading': 'Speiseplan wird geladen …',
    'mensa.error': 'Speiseplan nicht erreichbar. Bitte später erneut versuchen.',
    'mensa.none': 'Für diesen Tag ist kein Speiseplan veröffentlicht.',
    'mensa.noMatch': 'Keine Gerichte für diesen Filter.',
    'mensa.price': 'Preis für',
    'mensa.role.students': 'Studierende',
    'mensa.role.staff': 'Bedienstete',
    'mensa.role.guests': 'Gäste',
    'mensa.diet.all': 'Alle',
    'mensa.diet.vegetarian': 'Vegetarisch',
    'mensa.diet.vegan': 'Vegan',
    'mensa.diet.nopork': 'Ohne Schwein',
    'mensa.dietLabel.vegan': 'vegan',
    'mensa.dietLabel.vegetarian': 'vegetarisch',
    'mensa.dietLabel.fish': 'Fisch',
    'mensa.dietLabel.meat': 'Fleisch',
    'mensa.allergens': 'Allergene',
    'mensa.additives': 'Zusatzstoffe',
    'mensa.quality': 'Qualität',
    'mensa.details': 'Allergene & Zusatzstoffe',
    'mensa.warn': '⚠ Enthält {list}',
    'mensa.myAllergens': 'Meine Allergene',
    'mensa.myAllergensHelp': 'Gerichte mit diesen Allergenen werden markiert.',
    'mensa.hideConflicts': 'Markierte Gerichte ausblenden',
    'mensa.thisWeek': 'Diese Woche',
    'mensa.nextWeek': 'Nächste Woche',
    'mensa.today': 'heute',
    'mensa.source': 'Daten: Studierendenwerk München Oberbayern via TUM-Dev eat-api. Angaben ohne Gewähr – maßgeblich ist der Aushang in der Mensa.',
    'mensa.showOnMap': 'Auf der Karte',

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
    'today.lunch': 'Mittagspause? Heute in der Mensa: {dish}',
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

    'campus.saved': 'Meine Orte',
    'campus.savedEmpty': 'Tippe bei einem Ort auf ☆ Merken, damit er hier erscheint.',
    'campus.openNow': 'Essen & Trinken',
    'campus.services': 'Anlaufstellen',
    'campus.people': 'Professor:innen',
    'campus.peopleHelp': 'Büros laut Profilseiten auf hswt.de (Stand {date}). Sprechzeiten stehen im jeweiligen Profil.',
    'campus.contacts': 'Meine Kontakte',
    'campus.buildings': 'Alle Gebäude',
    'campus.settings': 'Einstellungen',
    'contact.add': 'Büro hinzufügen',
    'contact.help': 'Fehlt jemand? Schlage den Raum im HSWT-Personenverzeichnis nach und speichere ihn hier – dann findest du ihn in der Suche.',
    'contact.directory': 'Personenverzeichnis öffnen',
    'contact.name': 'Name',
    'contact.room': 'Raum (z. B. D1.436)',
    'contact.note': 'Notiz, z. B. Sprechstunde Di 10–11',
    'contact.submit': 'Speichern',
    'contact.badRoom': 'Raum „{room}“ gibt es auf dem Lageplan nicht. Format: Gebäude.Raum, z. B. D1.436',
    'settings.stepFree': 'Barrierefreie Routen (ohne Treppen)',
    'settings.buffer': 'Minuten früher ankommen',
    'settings.language': 'Sprache',
    'settings.reset': 'Einführung erneut zeigen',
    'settings.theme': 'Darstellung',
    'settings.theme.auto': 'Automatisch (wie System)',
    'settings.theme.light': 'Hell',
    'settings.theme.dark': 'Dunkel',
    'settings.themeToggle': 'Hell/Dunkel umschalten',
    'about.data':
      'Gebäude: OpenStreetMap-Umrisse, zugeordnet über den offiziellen HSWT-Lageplan. Büros & Anlaufstellen: hswt.de (Stand {date}). Routing: FOSSGIS Valhalla/OSRM. Haltestellen: DELFI/MVV. Mensa: Studierendenwerk via TUM-Dev eat-api.',

    'welcome.title': 'Willkommen beim HSWT Navigator',
    'welcome.search': 'Suche einen Raum (z. B. A6.301), eine Professorin oder die Mensa.',
    'welcome.route': 'Tippe auf „Route hierher“ – die App führt dich zu Fuß hin.',
    'welcome.today': 'Unter „Heute“ siehst du deine nächste Vorlesung und wann du losmusst.',
    'welcome.ok': 'Los geht’s',

    'toast.near': 'Du bist bei {name}',
    'toast.notOnCampus': 'Du bist gerade nicht auf dem Campus.',
    'toast.noGeo': 'Standort ist auf diesem Gerät nicht verfügbar.',
    'toast.geoDenied': 'Standort nicht verfügbar – bitte Berechtigung prüfen.',
    'toast.classNoRoom': 'Für diese Veranstaltung ist kein Raum auf dem Campus hinterlegt.',
    'toast.contactSaved': '{name} gespeichert – jetzt in der Suche zu finden.',
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
    'tab.mensa': 'Mensa',
    'tab.campus': 'Campus',
    'search.placeholder': 'Room (e.g. A6.301), person, Mensa …',
    'search.label': 'Search campus',
    'search.clear': 'Clear search',
    'search.recent': 'Recent',
    'search.favorites': 'Saved',
    'search.none': 'Nothing found. Tip: enter a room number like "D1.436" or a surname.',
    'locate.title': 'Show my location',
    'close': 'Close',

    'chip.mensa': 'Mensa',
    'chip.library': 'Library',
    'chip.tumLibrary': 'TUM library (till midnight)',
    'chip.studentService': 'Student.Service',
    'chip.cafe': 'Café',
    'chip.station': 'Station',
    'chip.people': 'Professors',

    'kind.building': 'Building',
    'kind.food': 'Food & drink',
    'kind.transit': 'Bus stop',
    'kind.residence': 'Residence hall',
    'kind.service': 'Office',
    'kind.study': 'Study & library',
    'kind.community': 'Community',
    'kind.parking': 'Car park',
    'kind.person': 'Office',
    'kind.contact': 'My contact',
    'kind.class': 'Your class',
    'kind.room': 'Room',

    'room.title': 'Room {code}',
    'room.hint': 'Room {room} is in building {building}. Room numbers are on the doors; each building has floor plans at the entrance.',

    'status.open': 'Open · closes {time}',
    'status.closedOpens': 'Closed · opens {day} {time}',
    'status.closed': 'Closed',
    'day.today': 'today',
    'day.tomorrow': 'tomorrow',

    'route.from': 'From',
    'route.go': 'Route here',
    'route.myLocation': 'My location',
    'route.station': 'Freising station',
    'route.group.start': 'Start',
    'route.group.buildings': 'Buildings',
    'route.group.other': 'Other places',
    'route.loading': 'Calculating route …',
    'route.summary': '{min} min walk · {dist}',
    'route.stepFree': 'Step-free route (no stairs)',
    'route.approx': 'Offline estimate (straight line) – routing service unreachable.',
    'route.osrmFallback': 'Fallback routing without step-free option.',
    'route.farAway': "You're not in Freising – the route starts at Freising station.",
    'route.steps': 'Directions',
    'route.attribution': 'Routing: {provider} · Data © OpenStreetMap',
    'route.none': 'No route found.',
    'route.arrive': 'Destination: {target}',

    'sheet.address': 'Address',
    'sheet.room': 'Room',
    'sheet.hours': 'Opening hours',
    'sheet.phone': 'Phone',
    'sheet.email': 'Email',
    'sheet.website': 'More on hswt.de',
    'sheet.websiteOther': 'Website',
    'sheet.note': 'Note',
    'sheet.profile': 'Profile & office hours on hswt.de',
    'sheet.share': 'Share',
    'sheet.copied': 'Link copied',
    'sheet.save': 'Save',
    'sheet.saved': 'Saved',
    'sheet.inside': 'Inside',
    'sheet.people': 'Offices in this building',
    'sheet.source': 'Source: hswt.de, as of {date}',
    'sheet.positionPlan': 'Position from the HSWT site plan (no OpenStreetMap outline available).',
    'sheet.hoursSource': 'Opening hours from Studierendenwerk (eat-api)',
    'sheet.todayMenu': 'Today at the Mensa',
    'sheet.fullMenu': 'Full menu',
    'sheet.menuNone': 'No menu published for today.',
    'sheet.removeContact': 'Delete contact',

    'mensa.title': 'Menu',
    'mensa.loading': 'Loading menu …',
    'mensa.error': 'Menu unavailable. Please try again later.',
    'mensa.none': 'No menu published for this day.',
    'mensa.noMatch': 'No dishes match this filter.',
    'mensa.price': 'Prices for',
    'mensa.role.students': 'Students',
    'mensa.role.staff': 'Staff',
    'mensa.role.guests': 'Guests',
    'mensa.diet.all': 'All',
    'mensa.diet.vegetarian': 'Vegetarian',
    'mensa.diet.vegan': 'Vegan',
    'mensa.diet.nopork': 'No pork',
    'mensa.dietLabel.vegan': 'vegan',
    'mensa.dietLabel.vegetarian': 'vegetarian',
    'mensa.dietLabel.fish': 'fish',
    'mensa.dietLabel.meat': 'meat',
    'mensa.allergens': 'Allergens',
    'mensa.additives': 'Additives',
    'mensa.quality': 'Quality',
    'mensa.details': 'Allergens & additives',
    'mensa.warn': '⚠ Contains {list}',
    'mensa.myAllergens': 'My allergens',
    'mensa.myAllergensHelp': 'Dishes with these allergens are flagged.',
    'mensa.hideConflicts': 'Hide flagged dishes',
    'mensa.thisWeek': 'This week',
    'mensa.nextWeek': 'Next week',
    'mensa.today': 'today',
    'mensa.source': 'Data: Studierendenwerk München Oberbayern via TUM-Dev eat-api. No guarantee – the notice at the Mensa is authoritative.',
    'mensa.showOnMap': 'On the map',

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
    'today.lunch': 'Lunch break? At the Mensa today: {dish}',
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

    'campus.saved': 'My places',
    'campus.savedEmpty': 'Tap ☆ Save on a place to keep it here.',
    'campus.openNow': 'Food & drink',
    'campus.services': 'Where to go for help',
    'campus.people': 'Professors',
    'campus.peopleHelp': 'Offices from the profile pages on hswt.de (as of {date}). Office hours are on each profile.',
    'campus.contacts': 'My contacts',
    'campus.buildings': 'All buildings',
    'campus.settings': 'Settings',
    'contact.add': 'Add an office',
    'contact.help': 'Someone missing? Look up their room in the HSWT person directory and save it here – then search finds it.',
    'contact.directory': 'Open person directory',
    'contact.name': 'Name',
    'contact.room': 'Room (e.g. D1.436)',
    'contact.note': 'Note, e.g. office hour Tue 10–11',
    'contact.submit': 'Save',
    'contact.badRoom': 'Room "{room}" is not on the site plan. Format: building.room, e.g. D1.436',
    'settings.stepFree': 'Step-free routes (avoid stairs)',
    'settings.buffer': 'Minutes to arrive early',
    'settings.language': 'Language',
    'settings.reset': 'Show introduction again',
    'settings.theme': 'Appearance',
    'settings.theme.auto': 'Automatic (system)',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.themeToggle': 'Switch light/dark',
    'about.data':
      'Buildings: OpenStreetMap outlines, matched via the official HSWT site plan. Offices: hswt.de (as of {date}). Routing: FOSSGIS Valhalla/OSRM. Stops: DELFI/MVV. Mensa: Studierendenwerk via TUM-Dev eat-api.',

    'welcome.title': 'Welcome to HSWT Navigator',
    'welcome.search': 'Search for a room (e.g. A6.301), a professor or the Mensa.',
    'welcome.route': 'Tap "Route here" – the app walks you there.',
    'welcome.today': 'Under "Today" you see your next class and when to leave.',
    'welcome.ok': "Let's go",

    'toast.near': "You're near {name}",
    'toast.notOnCampus': "You're not on campus right now.",
    'toast.noGeo': 'Location is not available on this device.',
    'toast.geoDenied': 'Could not get your location. Check location permissions.',
    'toast.classNoRoom': 'This class has no room on campus yet.',
    'toast.contactSaved': '{name} saved – search finds them now.',
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

export function hasAllKeys() {
  const de = Object.keys(STRINGS.de);
  const en = Object.keys(STRINGS.en);
  return { missingInEn: de.filter((k) => !(k in STRINGS.en)), missingInDe: en.filter((k) => !(k in STRINGS.de)) };
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
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' });
  const shortDate = (d) => dayMonth.format(d);

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

  // Weekly hours → ["Mo 08:00–12:00", "Mi 10:00–15:00", …], merging days with identical hours.
  function weeklyHours(hours) {
    const lines = [];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const fmt = (ranges) => ranges.map(([a, b]) => `${a}–${b}`).join(', ');
    let i = 0;
    while (i < order.length) {
      const d = order[i];
      if (!hours?.[d]) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < order.length && hours[order[j + 1]] && fmt(hours[order[j + 1]]) === fmt(hours[d])) j++;
      const days = j > i ? `${weekday(d, true)}–${weekday(order[j], true)}` : weekday(d, true);
      lines.push(`${days} ${fmt(hours[d])}`);
      i = j + 1;
    }
    return lines;
  }

  const time = (d) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const distance = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`);

  return { lang, locale, t, pick, countdown, weekday, shortDate, openingStatus, weeklyHours, time, distance };
}
