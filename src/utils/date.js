/** Date helpers. Dates are stored as local "YYYY-MM-DD" keys. */

export const pad = (n) => (n < 10 ? '0' + n : '' + n);

export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function parseDateKey(s) {
  const [y, m, d] = s.split('-');
  return new Date(+y, +m - 1, +d);
}

export const todayKey = () => dateKey(new Date());

/** "रविवार, 14 नवंबर" in the given calendar language. */
export const formatLong = (d, cal) => `${cal.days[d.getDay()]}, ${d.getDate()} ${cal.months[d.getMonth()]}`;

/** "14 नवं" / "14 Nov" / "14 નવેમ્બર". */
export function formatShort(key, cal, lang) {
  const d = parseDateKey(key);
  const len = lang === 'en' ? 3 : lang === 'gu' ? 20 : 4;
  return `${d.getDate()} ${cal.months[d.getMonth()].slice(0, len)}`;
}

/** Seconds → "m:ss". */
export function formatTime(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
