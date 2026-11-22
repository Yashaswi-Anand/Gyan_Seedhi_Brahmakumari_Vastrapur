/** Marks per murli question; chart questions carry 10 or 20 (see CHART_MARKS). */
export const POINTS_PER_QUESTION = 20;
/** Marks a chart question can carry (the teacher picks one per question; 20 when not set). */
export const CHART_MARKS = [10, 20];
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
