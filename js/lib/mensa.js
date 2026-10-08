// Canteen menus from TUM-Dev's open eat-api (Studierendenwerk München Oberbayern data).
// https://tum-dev.github.io/eat-api/<canteen>/<iso-year>/<iso-week>.json

import { LABELS } from '../data/mensa-labels.js';

export const EAT_API = 'https://tum-dev.github.io/eat-api';
export const ROLES = ['students', 'staff', 'guests'];
export const DIETS = ['all', 'vegetarian', 'vegan', 'nopork'];

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

export function menuUrl(canteenId, date) {
  const { year, week } = isoWeek(date);
  return `${EAT_API}/${canteenId}/${year}/${String(week).padStart(2, '0')}.json`;
}

// On weekends the useful menu is next week's.
export function menuWeekStart(today) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 6 ? 2 : dow === 0 ? 1 : 1 - dow));
  return d;
}

function dietOf(labels) {
  if (labels.has('VEGAN')) return 'vegan';
  if (labels.has('VEGETARIAN')) return 'vegetarian';
  if (['MEAT', 'PORK', 'BEEF', 'VEAL', 'WILD_MEAT', 'LAMB', 'POULTRY'].some((l) => labels.has(l))) return 'meat';
  if (labels.has('FISH')) return 'fish';
  return null;
}

// Raw eat-api dish → display model (language-neutral; names are picked in the UI).
export function parseDish(dish) {
  const labels = new Set(dish.labels ?? []);
  const known = [...labels].filter((l) => LABELS[l]);
  const byGroup = (g) => known.filter((l) => LABELS[l].group === g);
  const allergenFamilies = [...new Set(byGroup('allergen').map((l) => LABELS[l].allergen))];
  return {
    name: dish.name,
    type: dish.dish_type ?? '',
    prices: dish.prices ?? {},
    diet: dietOf(labels),
    meat: ['PORK', 'BEEF', 'VEAL', 'WILD_MEAT', 'LAMB', 'POULTRY', 'FISH'].filter((l) => labels.has(l)),
    allergens: byGroup('allergen'),
    allergenFamilies,
    additives: byGroup('additive'),
    quality: byGroup('quality'),
  };
}

export function daysOf(weekJson) {
  return (weekJson?.days ?? []).map((d) => ({ date: d.date, dishes: (d.dishes ?? []).map(parseDish) }));
}

export function dishesOn(weekJson, isoDate) {
  return daysOf(weekJson).find((d) => d.date === isoDate)?.dishes ?? [];
}

// { base_price, price_per_unit, unit } → "3,35 €", "0,90 €/100g", "1,50 € + 0,90 €/100g", or "" if unknown.
export function formatPrice(p, locale = 'de-DE') {
  if (!p) return '';
  const eur = (v) => v.toLocaleString(locale, { style: 'currency', currency: 'EUR' });
  return [p.base_price ? eur(p.base_price) : '', p.price_per_unit ? `${eur(p.price_per_unit)}/${p.unit ?? ''}` : '']
    .filter(Boolean)
    .join(' + ');
}

export function matchesDiet(dish, diet) {
  if (diet === 'vegan') return dish.diet === 'vegan';
  if (diet === 'vegetarian') return dish.diet === 'vegan' || dish.diet === 'vegetarian';
  if (diet === 'nopork') return !dish.meat.includes('PORK');
  return true;
}

// Allergen families of `dish` the user wants to avoid.
export function conflicts(dish, avoid) {
  return dish.allergenFamilies.filter((f) => avoid.includes(f));
}

// Keep the API's order of dish types ("StudiTopf", "Gericht 1", …).
export function groupByType(dishes) {
  const groups = new Map();
  for (const d of dishes) {
    if (!groups.has(d.type)) groups.set(d.type, []);
    groups.get(d.type).push(d);
  }
  return [...groups].map(([type, items]) => ({ type, dishes: items }));
}
