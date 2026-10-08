// Information from the HSWT website (www.hswt.de), collected 2026-10-08.
// Every entry links to its source page so it can be checked and updated.
// Rooms use HSWT's own format "<building>.<room>", e.g. "A6.301".

export const RETRIEVED = '2026-10-08';
export const SWITCHBOARD = { phone: '+49 8161 71-0', address: 'Am Hofgarten 4, 85354 Freising' };
export const PERSON_DIRECTORY_URL = 'https://www.hswt.de/en/about/contact/register-of-persons';

// Postal addresses of buildings as given on faculty / service pages.
export const ADDRESSES = {
  A3: 'Am Hofgarten 10',
  A5: 'Am Hofgarten 6',
  A6: 'Am Hofgarten 4',
  A8: 'Am Hofgarten 2',
  C4: 'Weihenstephaner Berg 5',
  C5: 'Vöttinger Str. 27',
  D1: 'Am Staudengarten 1',
  F9: 'Hans-Carl-von-Carlowitz-Platz 3',
  H6: 'Am Staudengarten 11',
  H8: 'Am Staudengarten 14',
  H10: 'Am Staudengarten 10',
};

const weekdays = (open, close, friClose = close) => ({
  1: [[open, close]],
  2: [[open, close]],
  3: [[open, close]],
  4: [[open, close]],
  5: [[open, friClose]],
});

export const FACULTIES = {
  BI: { de: 'Bioingenieurwissenschaften', en: 'Bioengineering Sciences' },
  GL: { de: 'Gartenbau und Lebensmitteltechnologie', en: 'Horticulture and Food Technology' },
  LA: { de: 'Landschaftsarchitektur', en: 'Landscape Architecture' },
  NAE: { de: 'Nachhaltige Agrar- und Energiesysteme', en: 'Sustainable Agriculture and Energy Systems' },
  WF: { de: 'Wald und Forstwirtschaft', en: 'Forestry' },
};

// Offices people actually walk to. `hours` drive the open/closed badge; `note` covers the rest.
export const SERVICES = [
  {
    id: 'student-service',
    name: 'Student.Service',
    description: { de: 'Immatrikulation, Rückmeldung, Bescheinigungen, Prüfungsamt', en: 'Enrolment, re-registration, certificates, exams office' },
    aliases: ['Studierendenservice', 'Studentenservice', 'Student Office', 'Studienbüro', 'Immatrikulation', 'Rückmeldung', 'Bescheinigung', 'Prüfungsamt'],
    building: 'A6',
    room: 'A6.301',
    hours: { 1: [['08:00', '12:00']], 3: [['10:00', '15:00']], 4: [['08:00', '12:00']], 5: [['09:00', '13:00']] },
    note: { de: 'Di 8–12 Uhr nur telefonisch. Fr in der vorlesungsfreien Zeit bis 12 Uhr.', en: 'Tue 8–12 by phone only. Fri until 12 outside the lecture period.' },
    phone: '+49 8161 71-5592',
    url: 'https://www.hswt.de/en/study/during-study/service-advice/studentservice',
  },
  {
    id: 'studienberatung',
    name: { de: 'Allgemeine Studienberatung', en: 'General student advisory service' },
    description: { de: 'Beratung zu Studienwahl, Studienwechsel und Studienproblemen', en: 'Advice on choosing, changing or struggling with your studies' },
    aliases: ['Studienberatung', 'Beratung', 'Advisory', 'Counselling', 'Studienwechsel'],
    building: 'A6',
    hours: {
      1: [['09:00', '12:00'], ['14:00', '16:00']],
      2: [['09:00', '12:00'], ['14:00', '16:00']],
      4: [['09:00', '12:00'], ['14:00', '16:00']],
      5: [['09:00', '12:00']],
    },
    note: { de: 'In der vorlesungsfreien Zeit können die Zeiten abweichen.', en: 'Hours may differ outside the lecture period.' },
    phone: '+49 8161 71-2891',
    email: 'studienberatung.weihenstephan@hswt.de',
    url: 'https://www.hswt.de/en/study/during-study/service-advice/general-course-guidance-service',
  },
  {
    id: 'library',
    name: { de: 'Zentralbibliothek', en: 'Central library' },
    description: { de: 'Ausleihe, Lernplätze, Recherche', en: 'Lending, study spaces, research help' },
    aliases: ['Bibliothek', 'Library', 'Bib', 'Lernen', 'Study', 'Ausleihe', 'Bücher', 'Books'],
    building: 'A8',
    hours: weekdays('09:00', '16:00', '14:00'),
    note: { de: 'Öffnungszeiten in der Vorlesungszeit; in der vorlesungsfreien Zeit kürzer.', en: 'Lecture-period hours; shorter outside the lecture period.' },
    email: 'bibliothek@hswt.de',
    url: 'https://www.hswt.de/en/about/organisation/central-facilities/library',
  },
  {
    id: 'international-office',
    name: 'International Office (IFC)',
    description: { de: 'Auslandsaufenthalte, Förderung, internationale Studierende', en: 'Stays abroad, funding, international students' },
    aliases: ['International Office', 'IFC', 'Ausland', 'Erasmus', 'Auslandsamt', 'Abroad'],
    building: 'C4',
    url: 'https://www.hswt.de/en/international/facilities-for-international-affairs/international-office-funding-career-service',
  },
  {
    id: 'career-service',
    name: 'Career Service',
    description: { de: 'Bewerbungs- und Karriereberatung, Workshops', en: 'Application and career advice, workshops' },
    aliases: ['Career Center', 'Karriere', 'Bewerbung', 'Job', 'Praktikum', 'Internship'],
    building: 'C4',
    room: 'C4.312',
    phone: '+49 8161 71-3108',
    url: 'https://www.hswt.de/en/alumni-careers/career-service/weihenstephan-career-service.html',
  },
  {
    id: 'sprachenzentrum',
    name: { de: 'Sprachenzentrum', en: 'Language Centre' },
    description: { de: 'Sprachkurse; Teilbibliothek in Raum C4.204', en: 'Language courses; branch library in room C4.204' },
    aliases: ['Sprachen', 'Sprachkurs', 'Language', 'Englisch', 'Deutschkurs'],
    building: 'C4',
    room: 'C4.204',
    url: 'https://www.hswt.de/hochschule/organisation/zentrale-einrichtungen/zentrum-fuer-internationales',
  },
  {
    id: 'dekanat-gl',
    name: { de: 'Dekanat Gartenbau und Lebensmitteltechnologie', en: "Dean's office Horticulture and Food Technology" },
    description: { de: 'Frontoffice', en: 'Front office' },
    aliases: ['Dekanat', 'Gartenbau', 'Lebensmitteltechnologie', 'GL', 'Horticulture', 'Food Technology'],
    building: 'H10',
    room: 'H10.215',
    hours: weekdays('07:30', '12:15'),
    phone: '+49 8161 71-3378',
    url: 'https://www.hswt.de/en/about/organisation/departments/horticulture-and-food-technology',
  },
  {
    id: 'dekanat-wf',
    name: { de: 'Dekanat Wald und Forstwirtschaft', en: "Dean's office Forestry" },
    description: { de: 'Frontoffice', en: 'Front office' },
    aliases: ['Dekanat', 'Wald', 'Forst', 'Forstwirtschaft', 'Forestry', 'WF'],
    building: 'F9',
    room: 'F9.345',
    phone: '+49 8161 71-5901',
    url: 'https://www.hswt.de/en/about/organisation/departments/forestry',
  },
  {
    id: 'dekanat-nae',
    name: { de: 'Dekanat Nachhaltige Agrar- und Energiesysteme', en: "Dean's office Sustainable Agriculture and Energy Systems" },
    aliases: ['Dekanat', 'Agrar', 'Landwirtschaft', 'Energiesysteme', 'Agriculture', 'NAE'],
    building: 'D1',
    phone: '+49 8161 71-6402',
    email: 'ae@hswt.de',
    url: 'https://www.hswt.de/en/about/organisation/departments/sustainable-agriculture-and-energy-systems',
  },
  {
    id: 'dekanat-la',
    name: { de: 'Dekanat Landschaftsarchitektur', en: "Dean's office Landscape Architecture" },
    aliases: ['Dekanat', 'Landschaftsarchitektur', 'Landscape Architecture', 'LA'],
    building: 'A5',
    url: 'https://www.hswt.de/en/about/organisation/departments/landscape-architecture',
  },
  {
    id: 'dekanat-bi',
    name: { de: 'Dekanat Bioingenieurwissenschaften', en: "Dean's office Bioengineering Sciences" },
    aliases: ['Dekanat', 'Bioingenieurwissenschaften', 'Biotechnologie', 'Bioengineering', 'BI'],
    building: 'A3',
    url: 'https://www.hswt.de/en/about/organisation/departments/bioengineering-sciences',
  },
  {
    id: 'ilt',
    name: { de: 'Institut für Lebensmitteltechnologie', en: 'Institute for Food Technology' },
    aliases: ['Lebensmitteltechnologie', 'Food Technology', 'ILT'],
    building: 'H6',
    url: 'https://www.hswt.de/en/research/research-profile/research-institutions/institute-for-food-technology',
  },
  {
    id: 'asc',
    name: { de: 'Applied Science Centre Smart Indoor Farming', en: 'Applied Science Centre Smart Indoor Farming' },
    aliases: ['ASC', 'Indoor Farming', 'Vertical Farming'],
    building: 'H10',
    room: 'H10.322',
    url: 'https://www.hswt.de/forschung/forschungseinrichtungen/institut-fuer-gartenbau/smart-indoor-farming-asc',
  },
];

// Professors' offices from their HSWT profile pages. Office hours are on the profile pages.
export const PEOPLE = [
  // Bioingenieurwissenschaften
  { name: 'Prof. Dr. Jörg Kleiber', faculty: 'BI', room: 'A3.620', field: { de: 'Biochemie & Gentechnologie · Studiendekan', en: 'Biochemistry & genetic engineering · Dean of studies' }, url: 'https://www.hswt.de/joerg-kleiber' },
  { name: 'Prof. Dr. Ulrich Hege', faculty: 'BI', room: 'C5.208', field: { de: 'Studienfachberater Bioprozessinformatik', en: 'Subject advisor Bioprocess Informatics' }, url: 'https://www.hswt.de/ulrich-hege' },
  { name: 'Prof. Dr. Martin Stetter', faculty: 'BI', room: 'C5.210', field: { de: 'Bioinformatik & Datenbanken', en: 'Bioinformatics & databases' }, url: 'https://www.hswt.de/martin-stetter' },
  // Gartenbau und Lebensmitteltechnologie
  { name: 'Prof. Dr. Heike Susanne Mempel', faculty: 'GL', room: 'H10.322', field: { de: 'Technik im Gartenbau & Qualitätsmanagement', en: 'Horticultural engineering & quality management' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/heike-susanne-mempel' },
  { name: 'Prof. Dr. Sebastian Peisl', faculty: 'GL', room: 'H10.319', field: { de: 'Vizepräsident Forschung & Entwicklung', en: 'Vice President Research & Development' }, url: 'https://www.hswt.de/en/sebastian-peisl' },
  { name: 'Prof. Dr. Bernd Hertle', faculty: 'GL', room: 'H10.414', field: { de: 'Freilandzierpflanzen', en: 'Outdoor ornamental plants' }, url: 'https://www.hswt.de/en/bernd-hertle' },
  { name: 'Prof. Dr. Bernhard Hauser', faculty: 'GL', room: 'H11.306', field: { de: 'Gartenbau', en: 'Horticulture' }, url: 'https://www.hswt.de/bernhard-hauser' },
  // Landschaftsarchitektur
  { name: 'Prof. Dr. Julia Laube', faculty: 'LA', room: 'A5.412', field: { de: 'Dekanin · Ingenieurökologie & Landschaftsentwicklung', en: 'Dean · Engineering ecology & landscape development' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/julia-laube' },
  { name: 'Prof. Dr. Sabrina Wilk', faculty: 'LA', room: 'A5.426', field: { de: 'Studiendekanin Landschaftsarchitektur', en: 'Dean of studies Landscape Architecture' }, url: 'https://hswt.de/person/sabrina-wilk.html' },
  { name: 'Prof. Tilman Latz', faculty: 'LA', room: 'A5.405', field: { de: 'Planung & Entwurf · Leitung IMLA', en: 'Planning & design · Head of IMLA' }, url: 'https://hswt.de/person/tilman-latz.html' },
  { name: 'Prof. Sonja Hörster', faculty: 'LA', room: 'A5.405', field: { de: 'Kommunikation & Partizipation', en: 'Communication & participation' }, url: 'https://www.hswt.de/en/sonja-hoerster' },
  { name: 'Prof. Susanne Burger', faculty: 'LA', room: 'A5.406', field: { de: 'Entwerfen', en: 'Design' }, url: 'https://www.hswt.de/en/susanne-burger' },
  { name: 'Prof. Birgit Schmidt', faculty: 'LA', room: 'A5.421', field: { de: 'Projektplanung', en: 'Project planning' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/birgit-schmidt' },
  // Nachhaltige Agrar- und Energiesysteme
  { name: 'Prof. Dr. Thomas Ebertseder', faculty: 'NAE', room: 'D1.228', field: { de: 'Pflanzenbau · Studiendekan Master Agrarmanagement', en: 'Crop production · Dean of studies MSc Agricultural Management' }, url: 'https://hswt.de/person/thomas-ebertseder.html' },
  { name: 'Prof. Dr. Bernhard Schauberger', faculty: 'NAE', room: 'D1.216', field: { de: 'Agrarsysteme & Klimawandel', en: 'Agricultural systems & climate change' }, url: 'https://www.hswt.de/bernhard-schauberger' },
  { name: 'Prof. Dr. Petra Nicole Weindl', faculty: 'NAE', room: 'D1.218', field: null, url: 'https://www.hswt.de/person/petra-nicole-weindl' },
  { name: 'Prof. Dr. Daniel Werner', faculty: 'NAE', room: 'D1.417', field: { de: 'Verfahrenstechnik & Digitalisierung · Studiendekan Landwirtschaft', en: 'Process engineering & digitalisation · Dean of studies Agriculture' }, url: 'https://www.hswt.de/daniel-werner' },
  { name: 'Prof. Dr. Sarah Kühl', faculty: 'NAE', room: 'D1.436', field: { de: 'Marketing & Marktforschung', en: 'Marketing & market research' }, url: 'https://www.hswt.de/person/sarah-kuehl' },
  { name: 'Prof. Dr. Alois Scheuerlein', faculty: 'NAE', room: 'D1.438', field: { de: 'Landwirtschaftliche Betriebslehre & Management', en: 'Farm management' }, url: 'https://www.hswt.de/alois-scheuerlein' },
  { name: 'Prof. Dr. Jens Hartung', faculty: 'NAE', room: 'D1.439', field: { de: 'Mathematik, Statistik & Datenverarbeitung', en: 'Mathematics, statistics & data processing' }, url: 'https://www.hswt.de/person/jens-hartung' },
  // Wald und Forstwirtschaft
  { name: 'Prof. Dr. Sven Martens', faculty: 'WF', room: 'F9.408', field: { de: 'Waldbau & Waldwachstum', en: 'Silviculture & forest growth' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/sven-martens' },
  { name: 'Prof. Dr. Martin Walter', faculty: 'WF', room: 'F9.410', field: null, url: 'https://www.hswt.de/en/martin-walter' },
  { name: 'Prof. Dr. Barbara Darr', faculty: 'WF', room: 'F9.411', field: { de: 'Urbanes Waldmanagement', en: 'Urban forest management' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/barbara-darr' },
  { name: 'Prof. Andrea Stübner', faculty: 'WF', room: 'F9.420', field: { de: 'Forstökonomie & Betriebsplanung', en: 'Forest economics & operational planning' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/andrea-stuebner' },
  { name: 'Prof. Dr. Christian Zang', faculty: 'WF', room: 'F9.421', field: { de: 'Wald & Klimawandel', en: 'Forests & climate change' }, url: 'https://www.hswt.de/en/hochschule/kontakt/person-directory/profile/christian-zang' },
  { name: 'Prof. Dr. Andreas Rothe', faculty: 'WF', room: 'F9.422', field: { de: 'Angewandte Standortkunde & Ressourcenschutz', en: 'Applied site science & resource conservation' }, url: 'https://www.hswt.de/en/andreas-rothe' },
];
