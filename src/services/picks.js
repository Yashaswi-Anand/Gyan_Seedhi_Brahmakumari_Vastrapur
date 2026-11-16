/* Questions the teacher ticked in the AI chat, waiting in the Draft tab until they are
   published for a date. Kept on this phone only (localStorage); nothing reaches Firestore
   until the teacher publishes. */
import { useSyncExternalStore } from 'react';

const KEY = 'gs2_qa_picks_v1';
const listeners = new Set();
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    cache = Array.isArray(v) ? v.filter((p) => p && p.key && p.question) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    if (next.length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or blocked: the list still works until the app is closed */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** [{ key, question, murliDate }] in the order they were ticked. */
export const usePicks = () => useSyncExternalStore(subscribe, read);

/** Ticks or unticks one offered question (`key` = tool call id + index). */
export function togglePick(key, question, murliDate) {
  const list = read();
  write(list.some((p) => p.key === key) ? list.filter((p) => p.key !== key) : [...list, { key, question, murliDate }]);
}

export const removePick = (key) => write(read().filter((p) => p.key !== key));
export const clearPicks = () => write([]);
