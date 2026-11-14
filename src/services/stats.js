/* Progress maths: streaks, badges, points, levels, tree and the centre rank list. */
import { DEMO_NAMES, LEVELS } from '@/constants/config';
import { BADGES } from '@/data/badges';
import { addDays, dateKey, parseDateKey, todayKey } from '@/utils/date';
import { hash, sum } from '@/utils/helpers';

export const hasPlayedToday = (u) => u.plays.some((p) => p.date === todayKey());

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

/* ---------- growth tree: one leaf per day of practice ---------- */

export function leafCount(u) {
  const d = {};
  u.plays.forEach((p) => (d[p.date] = 1));
  return Object.keys(d).length;
}

export const treeStage = (n) =>
  n < 1 ? 'बीज' : n <= 6 ? 'अंकुर' : n <= 13 ? 'पौधा' : n <= 27 ? 'वृक्ष' : 'फलदार वृक्ष';

/* ---------- rank list ---------- */

function demoStat(name, scope) {
  const x = hash(name + scope);
  if (scope === 'today') return { pts: 80 + (x % 13) * 10, time: 200 + (x % 60) * 5 };
  if (scope === 'week') return { pts: 500 + (x % 61) * 10, time: 1500 + (x % 40) * 20 };
  if (scope === 'month') return { pts: 1100 + (x % 91) * 10, time: 4000 + (x % 50) * 40 };
  return { pts: 1400 + (x % 160) * 10, time: 6000 + (x % 60) * 100 };
}

function myStat(u, scope) {
  let pl = u.plays;
  const t = todayKey();
  if (scope === 'today') pl = pl.filter((p) => p.date === t);
  else if (scope === 'week') {
    const from = dateKey(addDays(new Date(), -6));
    pl = pl.filter((p) => p.date >= from);
  } else if (scope === 'month') {
    const mo = t.slice(0, 7);
    pl = pl.filter((p) => p.date.slice(0, 7) === mo);
  }
  if (!pl.length) return null;
  return { pts: sum(pl, (p) => p.points), time: sum(pl, (p) => p.timeSec) };
}

/** Rank by points (desc), ties broken by less time. Includes the current user once they have played. */
export function rankRows(u, scope) {
  const rows = DEMO_NAMES.map((n) => ({ name: n, me: false, ...demoStat(n, scope) }));
  const m = myStat(u, scope);
  if (m) rows.push({ name: u.name, me: true, ...m });
  rows.sort((a, b) => b.pts - a.pts || a.time - b.time);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export const myRank = (rows) => rows.find((r) => r.me) || null;
