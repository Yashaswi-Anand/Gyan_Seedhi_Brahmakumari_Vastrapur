/* Student results in Firestore, so the teacher can see everyone's scores.
   Collection `results`, one document per student per day, id `${mobile}_${date}`.
   The security rules allow creating a day's result once; it can't be changed after. */
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { addDays, dateKey, parseDateKey, todayKey } from '@/utils/date';
import { weekStart } from './stats';
import { storage } from './storage';

const col = collection(db, 'results');
const SYNCED_KEY = 'gs2_synced';
const int = (n, fallback = 0) => (Number.isFinite(+n) ? Math.round(+n) : fallback);

function loadSynced() {
  try {
    return JSON.parse(storage.get(SYNCED_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function markSynced(mobile, date) {
  const all = loadSynced();
  all[mobile] = Array.from(new Set([...(all[mobile] || []), date]));
  storage.set(SYNCED_KEY, JSON.stringify(all));
}

/** Upload one day's play. Resolves 'saved', or 'exists' when that day is already stored. */
async function uploadPlay(user, play) {
  const data = {
    mobile: user.mobile,
    name: String(user.name).slice(0, 60),
    date: play.date,
    points: int(play.points),
    mPts: int(play.mPts ?? play.points),
    cPts: int(play.cPts),
    mMax: int(play.mMax, 100),
    cMax: int(play.cMax, 100),
    acc: Math.min(100, Math.max(0, int(play.acc))),
    first: int(play.first),
    total: int(play.total),
    timeSec: int(play.timeSec),
    createdAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(col, `${user.mobile}_${play.date}`), data);
    return 'saved';
  } catch (e) {
    // the day already exists (results are write-once) – nothing more to do
    if (e?.code === 'permission-denied') return 'exists';
    throw e;
  }
}

/* ---------- an existing student on a new phone ---------- */

/** Every saved day of one student, oldest first. */
export async function fetchStudentResults(mobile) {
  const snap = await getDocs(query(col, where('mobile', '==', mobile)));
  return snap.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Firestore result → the play record kept on the phone. */
export const resultToPlay = (r) => ({
  date: r.date,
  points: int(r.points),
  mPts: int(r.mPts ?? r.points),
  cPts: int(r.cPts),
  mMax: int(r.mMax, 100),
  cMax: int(r.cMax, 100),
  first: int(r.first),
  total: int(r.total),
  acc: int(r.acc),
  timeSec: int(r.timeSec),
  jodi: false,
});

/** Days that came from Firestore are already there: don't upload them again. */
export function markAllSynced(mobile, dates) {
  dates.forEach((d) => markSynced(mobile, d));
}

/** Upload every local play that hasn't reached Firestore yet. Safe to call often. */
export async function syncPlays(user) {
  const done = new Set(loadSynced()[user.mobile] || []);
  for (const play of user.plays) {
    if (done.has(play.date)) continue;
    try {
      await uploadPlay(user, play);
      markSynced(user.mobile, play.date);
    } catch {
      return; // offline or temporary error: try again next time
    }
  }
}

/* ---------- teacher leaderboard ---------- */

/**
 * Totals per student, ranked by total marks (high to low).
 * Equal totals share a rank and the next rank skips (1, 2, 2, 4); ties are listed by name.
 */
export function rankStudents(results) {
  const by = new Map();
  for (const r of results) {
    const s = by.get(r.mobile) || { mobile: r.mobile, name: r.name, lastDate: '', murli: 0, chart: 0, days: 0 };
    s.murli += int(r.mPts);
    s.chart += int(r.cPts);
    s.days += 1;
    if (r.date >= s.lastDate) {
      s.lastDate = r.date;
      s.name = r.name; // latest name the student used
    }
    by.set(r.mobile, s);
  }
  const rows = [...by.values()].map((s) => ({ ...s, total: s.murli + s.chart }));
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  let prev = null;
  rows.forEach((r, i) => {
    r.rank = prev && prev.total === r.total ? prev.rank : i + 1;
    prev = r;
  });
  return rows;
}

/** How many days back a student counts as active for the "आज बाकी" (not done today) list. */
export const ACTIVE_DAYS = 30;

/**
 * Students who practised in the given results but have no result for `today`,
 * the most recent first: [{ mobile, name, lastDate, days }].
 */
export function pendingToday(results, today = todayKey()) {
  const by = new Map();
  for (const r of results) {
    if (!r?.mobile || !r.date) continue;
    const s = by.get(r.mobile) || { mobile: r.mobile, name: r.name, lastDate: '', days: 0, today: false };
    s.days += 1;
    if (r.date === today) s.today = true;
    if (r.date >= s.lastDate) {
      s.lastDate = r.date;
      s.name = r.name;
    }
    by.set(r.mobile, s);
  }
  return [...by.values()]
    .filter((s) => !s.today)
    .map(({ today: _t, ...s }) => s)
    .sort((a, b) => (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : a.name.localeCompare(b.name)));
}

/**
 * Top 3 of every finished week (Monday–Sunday) and month, newest first:
 * { weeks: [{ key, from, to, students, top }], months: [{ key, students, top }] }.
 * The running week and month are left out (they show on the इस सप्ताह / इस महीने tabs).
 */
export function winnersHistory(results, today = todayKey(), limit = 12) {
  const thisWeek = weekStart(today);
  const thisMonth = today.slice(0, 7);
  const weeks = new Map();
  const months = new Map();
  for (const r of results) {
    if (!r?.date) continue;
    const w = weekStart(r.date);
    const m = r.date.slice(0, 7);
    if (w < thisWeek) weeks.set(w, [...(weeks.get(w) || []), r]);
    if (m < thisMonth) months.set(m, [...(months.get(m) || []), r]);
  }
  const top = (rs) => {
    const rows = rankStudents(rs);
    return { students: rows.length, top: rows.filter((x) => x.rank <= 3) };
  };
  return {
    weeks: [...weeks.keys()]
      .sort()
      .reverse()
      .slice(0, limit)
      .map((key) => ({ key, from: key, to: dateKey(addDays(parseDateKey(key), 6)), ...top(weeks.get(key)) })),
    months: [...months.keys()]
      .sort()
      .reverse()
      .slice(0, limit)
      .map((key) => ({ key, ...top(months.get(key)) })),
  };
}

/** [from, to] date keys: week = this week from Monday, month = this calendar month, all = everything. */
export function rangeFor(scope) {
  const today = todayKey();
  if (scope === 'week') return [weekStart(today), today];
  if (scope === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  if (scope === 'active') return [dateKey(addDays(parseDateKey(today), -(ACTIVE_DAYS - 1))), today];
  return ['0000-01-01', '9999-12-31'];
}

/** Live results between two date keys (inclusive). Returns an unsubscribe function. */
export function watchResults(from, to, onData, onError) {
  const q = query(col, where('date', '>=', from), where('date', '<=', to));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    (err) => onError?.(err),
  );
}
