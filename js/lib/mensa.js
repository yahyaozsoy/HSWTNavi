// Daily canteen menus from TUM-Dev's open eat-api (Studierendenwerk München Oberbayern data).
// https://tum-dev.github.io/eat-api/<canteen>/<iso-year>/<iso-week>.json

export const EAT_API = 'https://tum-dev.github.io/eat-api';

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

const ICONS = { VEGAN: '🌱', VEGETARIAN: '🥕', FISH: '🐟', PORK: '🐖', BEEF: '🐄', POULTRY: '🐔' };

// → [{ name, type, price, icons }] for the given ISO date ("YYYY-MM-DD"), or [] if none.
export function dishesOn(weekJson, isoDate) {
  const day = weekJson?.days?.find((d) => d.date === isoDate);
  return (day?.dishes ?? []).map((dish) => {
    const p = dish.prices?.students;
    const price = p
      ? [p.base_price ? `${p.base_price.toFixed(2)} €` : '', p.price_per_unit ? `${p.price_per_unit.toFixed(2)} €/${p.unit}` : '']
          .filter(Boolean)
          .join(' + ')
      : '';
    return {
      name: dish.name,
      type: dish.dish_type ?? '',
      price,
      icons: (dish.labels ?? []).map((l) => ICONS[l]).filter(Boolean).join(''),
    };
  });
}
