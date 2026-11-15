/* Runs the Q/A chat's tool calls in the browser.
   - list_questions runs straight away (read-only).
   - propose_* calls are checked here, shown to the teacher as cards, and only written to
     Firestore when the teacher taps Apply. */
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

/** list_questions → compact JSON for Claude. */
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
    hint: murli ? clip(v?.hint, 500) : '',
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

/** Checks a whole proposal. Returns { error } or the cleaned data the card shows and saves. */
export function checkProposal(name, input, all) {
  const byId = new Map(all.map((q) => [q.id, q]));
  if (name === 'propose_add_questions') {
    const list = Array.isArray(input?.questions) ? input.questions : [];
    if (!list.length) return { error: 'no questions in the proposal' };
    if (list.length > 3) return { error: 'at most 3 questions per call' };
    const questions = [];
    for (const [i, q] of list.entries()) {
      const r = checkQuestion(q);
      if (r.error) return { error: `question ${i + 1}: ${r.error}` };
      questions.push(r.question);
    }
    return { questions };
  }
  if (name === 'propose_update_question') {
    const existing = byId.get(input?.id);
    if (!existing) return { error: `no question with id ${input?.id}; call list_questions first` };
    const r = checkQuestion(input?.question);
    if (r.error) return { error: r.error };
    return { existing, question: r.question };
  }
  if (name === 'propose_delete_questions') {
    const ids = Array.isArray(input?.ids) ? input.ids : [];
    const found = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!found.length) return { error: 'none of these ids exist; call list_questions first' };
    return { questions: found, missing: ids.filter((id) => !byId.has(id)) };
  }
  return { error: `unknown tool ${name}` };
}

/** Writes an approved proposal to Firestore. Returns the tool result text for Claude. */
export async function applyProposal(name, checked) {
  if (name === 'propose_add_questions') {
    const ids = [];
    for (const q of checked.questions) ids.push((await addQuestion(q)).id);
    return `APPLIED by the teacher. Added ${ids.length} question(s). New ids: ${ids.join(', ')}`;
  }
  if (name === 'propose_update_question') {
    await updateQuestion(checked.existing.id, checked.question, checked.existing);
    return `APPLIED by the teacher. Question ${checked.existing.id} was updated.`;
  }
  if (name === 'propose_delete_questions') {
    for (const q of checked.questions) await deleteQuestion(q.id);
    return `APPLIED by the teacher. Deleted ${checked.questions.length} question(s).`;
  }
  throw new Error('unknown proposal');
}

export const CANCELLED = 'CANCELLED by the teacher. Nothing was changed.';
