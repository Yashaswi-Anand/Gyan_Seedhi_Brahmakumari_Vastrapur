/* Progress maths: streaks, badges, points, levels, tree and day-by-day results. */
import { LEVELS } from '@/constants/config';
import { BADGES } from '@/data/badges';
import { addDays, dateKey, parseDateKey, todayKey } from '@/utils/date';
import { sum } from '@/utils/helpers';

/** Monday of the week a date key falls in (weeks run Monday to Sunday). */
export function weekStart(key) {
  const d = parseDateKey(key);
  return dateKey(addDays(d, -((d.getDay() + 6) % 7)));
}

export const hasPlayedToday =(u) => u.plays.some((p) => p.date === todayKey());

export const todaysPlay = (u) => u.plays.find((p) => p.date === todayKey()) || null;

export function streaks(plays) {
  const set = {};
  plays.forEach((p) => (set[p.date] = 1));
  let best = 0;
  let run = 0;
  let prev = null;
  Object.keys(set)
    .sort()
    .forEach((d) => {
      run = prev && dateKey(addDays(parseDateKey(prev), 1)) === d ? run + 1 : 1;
      if (run > best) best = run;
      prev = d;
    });
  let cur = 0;
  let c = new Date();
  if (!set[dateKey(c)]) c = addDays(c, -1);
  while (set[dateKey(c)]) {
    cur++;
    c = addDays(c, -1);
  }
  return { cur, best };
}

/* Murli = questions 1–5, Chart = questions 6–10. Plays saved before the split count fully as Murli. */
export const murliPts = (p) => (p.mPts != null ? p.mPts : p.points);
export const chartPts = (p) => (p.cPts != null ? p.cPts : 0);
export const totalPts = (u) => sum(u.plays, (x) => x.points);
export const totalMurli = (u) => sum(u.plays, murliPts);
export const totalChart = (u) => sum(u.plays, chartPts);

export function earnedBadgeIds(u) {
  const s = {};
  const p = u.plays;
  if (p.length >= 1) s.first = 1;
  const days = {};
  p.forEach((x) => (days[x.date] = 1));
  if (Object.keys(days).length >= 5) s.days5 = 1;
  const st = streaks(p);
  if (st.best >= 3) s.s3 = 1;
  if (st.best >= 7) s.s7 = 1;
  if (p.some((x) => x.acc === 100)) s.perfect = 1;
  if (p.some((x) => x.jodi)) s.jodi = 1;
  const pts = totalPts(u);
  if (pts >= 100) s.p100 = 1;
  if (pts >= 500) s.p500 = 1;
  return s;
}

export function newBadges(before, after) {
  return BADGES.filter((b) => after[b.id] && !before[b.id]);
}

export function levelInfo(pts) {
  let i = 0;
  LEVELS.forEach((lv, k) => {
    if (pts >= lv) i = k;
  });
  const next = LEVELS[i + 1];
  return { n: i + 1, next, pct: next ? Math.round(((pts - LEVELS[i]) / (next - LEVELS[i])) * 100) : 100 };
}

/* ---------- this month: scores start from zero on the 1st of every month ---------- */

/** Number of days in the month of a date key (28 to 31). */
export function daysInMonth(key = todayKey()) {
  const [y, m] = key.split('-');
  return new Date(+y, +m, 0).getDate();
}

/** Plays of the current calendar month. */
export const monthPlays = (u) => {
  const mo = todayKey().slice(0, 7);
  return u.plays.filter((p) => p.date.slice(0, 7) === mo);
};
export const monthPts = (u) => sum(monthPlays(u), (x) => x.points);
export const monthMurli = (u) => sum(monthPlays(u), murliPts);
export const monthChart = (u) => sum(monthPlays(u), chartPts);

/* ---------- growth tree: one leaf per day of the month, lit for each day practised ---------- */

/** Days practised this month (the tree starts again every month). */
export function leafCount(u) {
  return new Set(monthPlays(u).map((p) => p.date)).size;
}

/** Stage of a tree with n of total leaves (total = days in the month). */
export function treeStage(n, total = daysInMonth()) {
  if (n < 1) return 'बीज';
  if (n >= total) return 'फलदार वृक्ष';
  const f = n / total;
  return f <= 0.25 ? 'अंकुर' : f <= 0.5 ? 'पौधा' : 'वृक्ष';
}

/* ---------- day-by-day results ---------- */

/** The signed-in member's saved plays, newest date first. */
export const playsNewestFirst = (u) => u.plays.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

/**
 * Keep plays inside a period.
 * week = this week from Monday, month = the current calendar month, all = everything.
 */
export function playsInScope(plays, scope) {
  if (scope === 'week') {
    const from = weekStart(todayKey());
    return plays.filter((p) => p.date >= from);
  }
  if (scope === 'month') {
    const mo = todayKey().slice(0, 7);
    return plays.filter((p) => p.date.slice(0, 7) === mo);
  }
  return plays;
}
