/* Runs the AI chat's tool calls in the browser.
   - list_questions runs straight away (read-only).
   - offer_questions is checked here and shown as a checklist; ticked questions wait in the
     Draft tab (services/picks.js) until the teacher publishes them for a date.
   - propose_* calls are checked here, shown to the teacher as cards, and only written to
     Firestore when the teacher taps Apply.
   - Limits: questions only (no tools exist for users or results), and only questions dated
     today or later; new / changed questions are saved as drafts until the teacher publishes. */
import { todayKey } from '@/utils/date';
import { addQuestion, deleteQuestion, sortQuestions, updateQuestion } from './questionsRepo';

const LANGS = ['hi', 'en', 'gu'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAGS = ['सही उत्तर चुनें', 'खाली जगह भरें', 'सही या गलत'];

/** Questions grouped by date, numbered the way students see them. */
export function numberQuestions(all) {
  const byDate = new Map();
  all.forEach((q) => byDate.set(q.date, [...(byDate.get(q.date) || []), q]));
  const numbered = new Map();
  for (const [, qs] of byDate) sortQuestions(qs).forEach((q, i) => numbered.set(q.id, i + 1));
  return numbered;
}

/** list_questions → compact JSON for the AI. */
export function runListQuestions(input, all) {
  const from = DATE_RE.test(input?.from_date) ? input.from_date : '0000-01-01';
  const to = DATE_RE.test(input?.to_date) ? input.to_date : '9999-12-31';
  const nums = numberQuestions(all);
  const rows = sortQuestions(all.filter((q) => q.date >= from && q.date <= to))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : nums.get(a.id) - nums.get(b.id)))
    .slice(0, 80)
    .map((q) => ({
      id: q.id,
      date: q.date,
      number: nums.get(q.id),
      category: q.category,
      tag: q.tag || '',
      q: q.i18n?.hi?.q || q.q,
      opts: q.category === 'murli' ? q.i18n?.hi?.opts || q.opts : [],
      ans: q.category === 'murli' ? q.ans : null,
      title: q.title || '',
      languages: q.i18n ? LANGS.filter((l) => q.i18n[l]) : ['hi'],
      published: q.published !== false,
    }));
  return JSON.stringify({ from, to, count: rows.length, questions: rows });
}

const clip = (s, max) => String(s ?? '').trim().slice(0, max);

/**
 * Checks one proposed question and returns { question } ready to save, or { error }.
 * Hindi is required; English / Gujarati versions are kept only when complete.
 */
export function checkQuestion(q) {
  if (!q || !DATE_RE.test(q.date)) return { error: 'missing or invalid date (use YYYY-MM-DD)' };
  if (!['murli', 'chart'].includes(q.category)) return { error: 'category must be murli or chart' };
  const murli = q.category === 'murli';
  const version = (v) => ({
    q: clip(v?.q, 1000),
    opts: murli ? (Array.isArray(v?.opts) ? v.opts : []).map((o) => clip(o, 200)) : [],
    hint: '', // no hints on questions made or changed in the AI chat (a kept hint is put back by checkProposal)
    exp: murli ? clip(v?.exp, 1000) : '',
    title: murli ? '' : clip(v?.title, 120),
  });
  const hi = version(q.i18n?.hi);
  if (!hi.q) return { error: 'the Hindi question text is empty' };
  if (murli) {
    if (hi.opts.length < 2 || hi.opts.length > 4) return { error: 'a murli question needs 2 to 4 options' };
    if (hi.opts.some((o) => !o)) return { error: 'an option is empty' };
    if (!Number.isInteger(q.ans) || q.ans < 0 || q.ans >= hi.opts.length) return { error: 'ans is not a valid option index' };
  }
  const i18n = { hi };
  for (const l of ['en', 'gu']) {
    const v = version(q.i18n?.[l]);
    const complete = v.q && (!murli || (v.opts.length === hi.opts.length && v.opts.every(Boolean)));
    if (complete) i18n[l] = v;
  }
  return {
    question: {
      date: q.date,
      category: q.category,
      tag: murli ? (TAGS.includes(q.tag) ? q.tag : TAGS[0]) : '',
      ans: murli ? q.ans : null,
      ...hi,
      i18n,
    },
  };
}

/** AI limit: only today's or future dates may be added, changed or deleted. */
const pastError = (date, today) =>
  `${date} is in the past. You may only add, change or delete questions dated today (${today}) or later; past questions and their answers are kept as they are.`;

/**
 * Checks a whole proposal. Returns { error } or the cleaned data the card shows and saves.
 * The AI may only touch questions dated today or later (checked again when Apply is tapped).
 */
/**
 * offer_questions → { format, murliDate, note, items: [{ question } | { error }] }.
 * Offered questions have no quiz date yet (the teacher picks it in the Draft tab), so they are
 * checked with today's date as a stand-in.
 */
export function checkOffer(input, today = todayKey()) {
  const format = TAGS.includes(input?.format) ? input.format : TAGS[0];
  const list = Array.isArray(input?.questions) ? input.questions.slice(0, 5) : [];
  const items = list.map((q) => {
    const r = checkQuestion({ date: today, category: 'murli', tag: format, ans: q?.ans, i18n: q?.i18n });
    return r.error ? { error: r.error } : { question: r.question };
  });
  return {
    format,
    murliDate: DATE_RE.test(input?.murli_date) ? input.murli_date : '',
    note: clip(input?.note, 200),
    items,
    error: items.length ? '' : 'no questions in the offer',
  };
}

/** Tool result for offer_questions (sent back straight away; the teacher ticks later). */
export function offerResult(offer) {
  const bad = offer.items.map((it, i) => (it.error ? `question ${i + 1}: ${it.error}` : '')).filter(Boolean);
  const shown = offer.items.length - bad.length;
  if (!shown) return { content: `INVALID: ${offer.error || bad.join('; ')}. Nothing was shown; fix it and call offer_questions again.`, is_error: true };
  return {
    content:
      `Shown to the teacher: ${shown} "${offer.format}" question(s), each with a checkbox. Nothing is saved yet; ` +
      'the teacher ticks the ones to keep and publishes them for a date from the Draft tab.' +
      (bad.length ? ` Not shown (invalid): ${bad.join('; ')}. You may offer corrected versions.` : ''),
  };
}

const CHART_FIXED =
  'chart questions are fixed (the same every day) and are not made or changed in this chat; make only murli questions. The teacher changes chart questions by hand in प्रश्न सूची.';

export function checkProposal(name, input, all, today = todayKey()) {
  const byId = new Map(all.map((q) => [q.id, q]));
  if (name === 'propose_add_questions') {
    const list = Array.isArray(input?.questions) ? input.questions : [];
    if (!list.length) return { error: 'no questions in the proposal' };
    if (list.length > 3) return { error: 'at most 3 questions per call' };
    const questions = [];
    for (const [i, q] of list.entries()) {
      if (q?.category === 'chart') return { error: `question ${i + 1}: ${CHART_FIXED}` };
      const r = checkQuestion(q);
      if (r.error) return { error: `question ${i + 1}: ${r.error}` };
      if (r.question.date < today) return { error: `question ${i + 1}: ${pastError(r.question.date, today)}`, past: true };
      questions.push(r.question);
    }
    return { questions };
  }
  if (name === 'propose_update_question') {
    const existing = byId.get(input?.id);
    if (!existing) return { error: `no question with id ${input?.id}; call list_questions first` };
    if (existing.date < today) return { error: pastError(existing.date, today), past: true };
    if (existing.category === 'chart' || input?.question?.category === 'chart') return { error: CHART_FIXED };
    const r = checkQuestion(input?.question);
    if (r.error) return { error: r.error };
    // the chat adds no hints, but a hint the teacher wrote on this question by hand stays as it was
    for (const [l, v] of Object.entries(r.question.i18n || {})) {
      const kept = existing.i18n?.[l]?.hint || (l === 'hi' ? existing.hint : '');
      if (kept && r.question.category === 'murli') v.hint = kept;
    }
    r.question.hint = r.question.i18n.hi.hint; // the main (Hindi) fields copy i18n.hi
    if (r.question.date < today) return { error: pastError(r.question.date, today), past: true };
    return { existing, question: r.question };
  }
  if (name === 'propose_delete_questions') {
    const ids = Array.isArray(input?.ids) ? input.ids : [];
    const found = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!found.length) return { error: 'none of these ids exist; call list_questions first' };
    if (found.some((q) => q.category === 'chart')) return { error: CHART_FIXED };
    const past = found.find((q) => q.date < today);
    if (past) return { error: pastError(past.date, today), past: true };
    return { questions: found, missing: ids.filter((id) => !byId.has(id)) };
  }
  return { error: `unknown tool ${name}` };
}

/**
 * Writes an approved proposal to Firestore. Returns the tool result text for the AI.
 * New and changed questions are saved as drafts: students see them only after the teacher
 * taps Publish.
 */
export async function applyProposal(name, checked, today = todayKey()) {
  // the date may have changed since the card was shown: check the limit again
  const dates = [
    ...(checked.questions || []).map((q) => q.date),
    checked.existing?.date,
    checked.question?.date,
  ].filter(Boolean);
  const past = dates.find((d) => d < today);
  if (past) throw Object.assign(new Error('past'), { code: 'past', date: past });

  if (name === 'propose_add_questions') {
    const ids = [];
    for (const q of checked.questions) ids.push((await addQuestion(q, { published: false })).id);
    return `APPLIED by the teacher. Saved ${ids.length} question(s) as DRAFTS (students can't see them until the teacher taps Publish). New ids: ${ids.join(', ')}`;
  }
  if (name === 'propose_update_question') {
    await updateQuestion(checked.existing.id, checked.question, checked.existing, { published: false });
    return `APPLIED by the teacher. Question ${checked.existing.id} was updated and is now a DRAFT until the teacher taps Publish.`;
  }
  if (name === 'propose_delete_questions') {
    for (const q of checked.questions) await deleteQuestion(q.id);
    return `APPLIED by the teacher. Deleted ${checked.questions.length} question(s).`;
  }
  throw new Error('unknown proposal');
}

export const CANCELLED = 'CANCELLED by the teacher. Nothing was changed.';
