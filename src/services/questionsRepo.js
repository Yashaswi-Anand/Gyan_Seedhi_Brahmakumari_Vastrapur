/* Questions in Firestore.
   Collection `questions`, one document per question:
     { date: 'YYYY-MM-DD', category: 'murli' | 'chart', q,
       opts?: string[], ans?: number, hint?, exp?, tag?,   // murli (multiple choice)
       title?,                                            // chart (self check, 0–20)
       i18n?: { hi, en, gu },                              // translations
       published?: boolean,                                // false = draft (students don't see it)
       order: number, createdAt, updatedAt } */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const col = collection(db, 'questions');

const fromSnap = (d) => ({ id: d.id, ...d.data() });

/** Murli questions first, then chart; within each, by `order`. */
export function sortQuestions(list) {
  const rank = (q) => (q.category === 'murli' ? 0 : 1);
  return list.slice().sort((a, b) => rank(a) - rank(b) || (a.order ?? 0) - (b.order ?? 0));
}

/** Drafts (published === false) are hidden from students; older questions have no flag = published. */
export const isPublished = (q) => q.published !== false;

/**
 * The question set for a day: published questions dated `dateKey`, or if there are none,
 * the most recent earlier date that has published questions. Returns { date, questions }.
 */
export async function fetchQuestionSet(dateKey) {
  const recent = await getDocs(query(col, where('date', '<=', dateKey), orderBy('date', 'desc'), limit(200)));
  const live = recent.docs.map(fromSnap).filter(isPublished);
  if (!live.length) return { date: null, questions: [] };
  const date = live[0].date; // newest date first
  return { date, questions: sortQuestions(live.filter((q) => q.date === date)) };
}

/** All questions saved for one date (published and drafts), in the order students see them. */
export async function fetchQuestionsForDate(dateKey) {
  const snap = await getDocs(query(col, where('date', '==', dateKey)));
  return sortQuestions(snap.docs.map(fromSnap));
}

/** Live list of every question (teacher view). Returns an unsubscribe function. */
export function watchAllQuestions(onData, onError) {
  return onSnapshot(
    col,
    (snap) => onData(snap.docs.map(fromSnap)),
    (err) => onError?.(err),
  );
}

/** One language version: { q, opts?, hint?, exp?, title? } with empty optional text dropped. */
function cleanVersion(v, category) {
  const out = { q: String(v.q || '').trim() };
  if (category === 'murli') {
    out.opts = (v.opts || []).map((o) => String(o || '').trim());
    if (v.hint?.trim()) out.hint = v.hint.trim();
    if (v.exp?.trim()) out.exp = v.exp.trim();
  } else if (v.title?.trim()) {
    out.title = v.title.trim();
  }
  return out;
}

/** Keep only the fields the security rules allow, dropping empty optional text. */
function clean(input) {
  const out = { date: input.date, category: input.category, ...cleanVersion(input, input.category) };
  if (input.category === 'murli') {
    out.ans = input.ans;
    if (input.tag?.trim()) out.tag = input.tag.trim();
  }
  // translations: i18n.hi / i18n.en / i18n.gu (only languages the teacher filled in)
  const i18n = {};
  for (const lang of ['hi', 'en', 'gu']) {
    const v = input.i18n?.[lang];
    if (v?.q?.trim()) i18n[lang] = cleanVersion(v, input.category);
  }
  if (Object.keys(i18n).length) out.i18n = i18n;
  return out;
}

/** @param published false saves a draft that students can't see until it is published */
export function addQuestion(input, { published = true } = {}) {
  return addDoc(col, {
    ...clean(input),
    published,
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Replaces the question's content; fields cleared in the form are removed.
 * @param published new draft/published state; by default the question keeps its current state
 */
export function updateQuestion(id, input, existing, { published } = {}) {
  const data = {
    ...clean(input),
    published: published ?? (existing ? isPublished(existing) : true),
    order: existing?.order ?? Date.now(),
    updatedAt: serverTimestamp(),
  };
  if (existing?.createdAt) data.createdAt = existing.createdAt;
  return setDoc(doc(db, 'questions', id), data);
}

/** Makes drafts visible to students (one batch write). */
export async function publishQuestions(ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) =>
      batch.update(doc(db, 'questions', id), { published: true, updatedAt: serverTimestamp() }),
    );
    await batch.commit();
  }
}

export const deleteQuestion = (id) => deleteDoc(doc(db, 'questions', id));
