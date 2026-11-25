/** Marks per murli question; chart questions carry their own marks (see CHART_MARKS). */
export const POINTS_PER_QUESTION = 20;
/** Marks a chart question can carry (the teacher picks one per question; 20 when not set). */
export const CHART_MARKS = [10, 15, 20, 25];
/**
 * Marks of a chart question document. Stored in its `tag` (e.g. "15"), which the live
 * Firestore rules already allow on chart questions; a `max` field is read too, for the day the
 * rules allow it. 20 when neither is set.
 */
export function chartMarksOf(d) {
  if (CHART_MARKS.includes(d?.max)) return d.max;
  const n = Number(d?.tag);
  return CHART_MARKS.includes(n) ? n : POINTS_PER_QUESTION;
}
/** Most marks a question can give: murli questions always 20, chart questions their own `max`. */
export const maxMarks = (q) => (q?.type === 'self' && CHART_MARKS.includes(q.max) ? q.max : POINTS_PER_QUESTION);

/**
 * Mobile numbers that get the Teacher role (Question/Answer tab and the student ranking).
 * Note: login has no OTP, so this is a convenience check in the app, not real security.
 */
export const TEACHER_MOBILES = ['9427940846'];

export const isTeacherMobile = (mobile) => TEACHER_MOBILES.includes(String(mobile));

/** Seconds allowed per question. */
export const TIME_LIMIT = 60;

/** Total-points thresholds for each level (level 1 starts at 0). */
export const LEVELS = [0, 100, 300, 600, 1000, 1600, 2400];

/** Mobile number and name of the built-in sample account. */
export const DEMO_ACCOUNT = { mobile: '9000000000', name: 'सुमन बहन (नमूना)', role: 'home' };

export const CENTRE_NAME = 'Brahmakumaris Vastrapur';

/** localStorage keys. */
export const STORAGE_KEYS = {
  users: 'gs2_users',
  session: 'gs2_session',
  lang: 'gs2_lang',
};
