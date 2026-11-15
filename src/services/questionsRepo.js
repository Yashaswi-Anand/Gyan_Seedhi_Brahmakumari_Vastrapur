/* Questions in Firestore.
   Collection `questions`, one document per question:
     { date: 'YYYY-MM-DD', category: 'murli' | 'chart', q,
       opts?: string[], ans?: number, hint?, exp?, tag?,   // murli (multiple choice)
       title?,                                            // chart (self check, 0–20)
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
} from 'firebase/firestore';
import { db } from './firebase';

const col = collection(db, 'questions');

const fromSnap = (d) => ({ id: d.id, ...d.data() });

/** Murli questions first, then chart; within each, by `order`. */
export function sortQuestions(list) {
  const rank = (q) => (q.category === 'murli' ? 0 : 1);
  return list.slice().sort((a, b) => rank(a) - rank(b) || (a.order ?? 0) - (b.order ?? 0));
}

/**
 * The question set for a day: questions dated `dateKey`, or if there are none,
 * the most recent earlier date that has questions. Returns { date, questions }.
 */
export async function fetchQuestionSet(dateKey) {
  const latest = await getDocs(query(col, where('date', '<=', dateKey), orderBy('date', 'desc'), limit(1)));
  if (latest.empty) return { date: null, questions: [] };
  const date = latest.docs[0].data().date;
  const same = await getDocs(query(col, where('date', '==', date)));
  return { date, questions: sortQuestions(same.docs.map(fromSnap)) };
}

/** Live list of every question (teacher view). Returns an unsubscribe function. */
export function watchAllQuestions(onData, onError) {
  return onSnapshot(
    col,
    (snap) => onData(snap.docs.map(fromSnap)),
    (err) => onError?.(err),
  );
}

/** Keep only the fields the security rules allow, dropping empty optional text. */
function clean(input) {
  const out = { date: input.date, category: input.category, q: input.q.trim() };
  if (input.category === 'murli') {
    out.opts = input.opts.map((o) => o.trim());
    out.ans = input.ans;
    if (input.tag?.trim()) out.tag = input.tag.trim();
    if (input.hint?.trim()) out.hint = input.hint.trim();
    if (input.exp?.trim()) out.exp = input.exp.trim();
  } else if (input.title?.trim()) {
    out.title = input.title.trim();
  }
  return out;
}

export function addQuestion(input) {
  return addDoc(col, { ...clean(input), order: Date.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

/** Replaces the question's content; fields cleared in the form are removed. */
export function updateQuestion(id, input, existing) {
  const data = { ...clean(input), order: existing?.order ?? Date.now(), updatedAt: serverTimestamp() };
  if (existing?.createdAt) data.createdAt = existing.createdAt;
  return setDoc(doc(db, 'questions', id), data);
}

export const deleteQuestion = (id) => deleteDoc(doc(db, 'questions', id));
