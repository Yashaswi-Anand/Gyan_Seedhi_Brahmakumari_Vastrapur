/* Turns a finished quiz into a result summary and (once a day) a saved play. */
import { BADGES } from '@/data/badges';
import { todayKey } from '@/utils/date';
import { sum } from '@/utils/helpers';
import { earnedBadgeIds, hasPlayedToday } from './stats';

export function summarizeQuiz(qs, res) {
  const isSelf = (k) => qs[k].type === 'self';
  const tot = sum(res, (r) => r.pts);
  const first = res.filter((r, k) => r.first && !isSelf(k)).length;
  const time = sum(res, (r) => r.time);
  const qn = qs.filter((q) => q.type !== 'self').length;
  const sn = qs.length - qn;
  const sp = sum(res.filter((_, k) => isSelf(k)), (r) => r.pts);
  const acc = Math.round((first / qn) * 100);
  const jodi = qs.some((q, k) => q.type === 'match' && res[k] && res[k].first);
  return { tot, first, time, qn, sn, sp, mp: tot - sp, acc, jodi };
}

/**
 * Builds the result for the result screen.
 * Returns { summary, play } where `play` is the record to save (null for a practice replay).
 */
export function buildResult(user, qs, res, practice) {
  const s = summarizeQuiz(qs, res);
  let play = null;
  let newB = [];
  if (!practice && !hasPlayedToday(user)) {
    play = {
      date: todayKey(),
      points: s.tot,
      mPts: s.mp,
      cPts: s.sp,
      first: s.first,
      total: qs.length,
      acc: s.acc,
      timeSec: s.time,
      jodi: s.jodi,
    };
    const updated = { ...user, plays: [...user.plays, play] };
    const before = earnedBadgeIds(user);
    const after = earnedBadgeIds(updated);
    newB = BADGES.filter((b) => after[b.id] && !before[b.id]);
  }
  // saved = this attempt was recorded as today's play (not a practice replay)
  return { play, summary: { ...s, newB, practice, saved: !!play } };
}
