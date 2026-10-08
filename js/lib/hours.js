// Opening-hours status ("open – closes 14:00", "closed – opens Mon 08:00").

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function openingStatus(hours, now = new Date()) {
  if (!hours) return { known: false };
  const day = now.getDay();
  const minute = now.getHours() * 60 + now.getMinutes();

  for (const [start, end] of hours[day] ?? []) {
    if (minute >= toMinutes(start) && minute < toMinutes(end)) {
      return { known: true, open: true, closesAt: end, closingSoon: toMinutes(end) - minute <= 30 };
    }
  }

  // Look ahead up to a week for the next opening.
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7;
    const ranges = [...(hours[d] ?? [])].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]));
    for (const [start] of ranges) {
      if (offset > 0 || toMinutes(start) > minute) {
        const when = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAY_NAMES[d];
        return { known: true, open: false, opensAt: start, opensDay: when };
      }
    }
  }
  return { known: true, open: false };
}

export function describeStatus(status) {
  if (!status.known) return '';
  if (status.open) return `Open · closes ${status.closesAt}`;
  if (status.opensAt) return `Closed · opens ${status.opensDay} ${status.opensAt}`;
  return 'Closed';
}
