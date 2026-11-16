/* Each day's question-by-question answers, kept on this device for the latest 7 days only.
   They are never sent to Firestore: `syncPlays` uploads only the day's marks. */
import { registerQuestionTranslations } from '@/i18n/translate';
import { addDays, dateKey, todayKey } from '@/utils/date';

export const ANSWER_DAYS = 7;

/** Oldest date whose answers are kept (today and the 6 days before it). */
export const answersFrom = () => dateKey(addDays(new Date(), -(ANSWER_DAYS - 1)));

/** Snapshot of the questions and what the student did, saved with the day's play. */
export function buildAnswers(qs, res) {
  return qs.map((q, k) => {
    const r = res[k] || { pts: 0, first: false, timeout: true };
    const a = { type: q.type, tag: q.tag, q: q.q, pts: r.pts, first: !!r.first, timeout: !!r.timeout };
    if (q.type === 'self') {
      if (q.ctxChip) a.title = q.ctxChip;
    } else {
      a.opts = q.opts;
      a.ans = q.ans;
      if (q.exp) a.exp = q.exp;
      if (r.wrong?.length) a.wrong = r.wrong;
    }
    if (q.i18n) a.i18n = q.i18n;
    return a;
  });
}

/** Drops answers older than the latest 7 days. Returns the same array when nothing changed. */
export function pruneAnswers(plays) {
  const from = answersFrom();
  if (!plays.some((p) => p.answers && p.date < from)) return plays;
  return plays.map((p) => {
    if (!p.answers || p.date >= from) return p;
    const { answers: _drop, ...rest } = p;
    return rest;
  });
}

/** Same, for every user on this device. */
export function pruneAllAnswers(db) {
  let changed = false;
  const out = {};
  for (const [k, u] of Object.entries(db)) {
    const plays = u?.plays ? pruneAnswers(u.plays) : u?.plays;
    if (plays !== u?.plays) changed = true;
    out[k] = plays !== u?.plays ? { ...u, plays } : u;
  }
  return changed ? out : db;
}

/** True when this day's answers can still be opened. */
export const hasAnswers = (play) => !!play.answers?.length && play.date >= answersFrom() && play.date <= todayKey();

/** Saved answer → the question shape the answer list uses (and registers its translations). */
export function answerToQuestion(a) {
  registerQuestionTranslations([{ q: a.q, opts: a.opts, exp: a.exp, title: a.title, i18n: a.i18n }]);
  return a.type === 'self'
    ? { type: 'self', tag: a.tag, q: a.q, ctxChip: a.title || '' }
    : { type: a.type || 'mcq', tag: a.tag, q: a.q, opts: a.opts || [], ans: a.ans, exp: a.exp || '' };
}
