/** Date of the murli today's question set is built from (Hindi; translated via i18n). */
export const QUIZ_DATE = '11 नवंबर 2026';

/** Marks per question (same for every question). */
export const POINTS_PER_QUESTION = 20;

/** Number of questions in a day's set. */
export const QUESTION_COUNT = 10;

export const MAX_POINTS = POINTS_PER_QUESTION * QUESTION_COUNT;

/** Seconds allowed per question. */
export const TIME_LIMIT = 60;

/** Total-points thresholds for each level (level 1 starts at 0). */
export const LEVELS = [0, 100, 300, 600, 1000, 1600, 2400];

/** Sample names used to fill the centre rank list until real members join. */
export const DEMO_NAMES = [
  'रमेश भाई', 'सुनीता बहन', 'अरुण भाई', 'मीना बहन', 'हितेश भाई',
  'कविता बहन', 'दिनेश भाई', 'पूनम बहन', 'जयेश भाई', 'लता बहन',
];

/** Mobile number and name of the built-in sample account. */
export const DEMO_ACCOUNT = { mobile: '9000000000', name: 'सुमन बहन (नमूना)', role: 'home' };

export const CENTRE_NAME = 'Brahmakumaris Vastrapur';

/** localStorage keys. */
export const STORAGE_KEYS = {
  users: 'gs2_users',
  session: 'gs2_session',
  lang: 'gs2_lang',
};
