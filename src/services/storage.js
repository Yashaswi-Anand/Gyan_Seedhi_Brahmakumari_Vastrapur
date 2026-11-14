/* localStorage wrapper with an in-memory fallback (private mode, blocked storage). */
import { STORAGE_KEYS } from '@/constants/config';
import { todayKey } from '@/utils/date';

const mem = {};

export const storage = {
  get(key) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? mem[key] ?? null : v;
    } catch {
      return mem[key] ?? null;
    }
  },
  set(key, value) {
    mem[key] = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

/* ---------- users ("database" kept on this device) ---------- */

export function loadUsers() {
  try {
    return JSON.parse(storage.get(STORAGE_KEYS.users) || '{}') || {};
  } catch {
    return {};
  }
}

export const saveUsers = (db) => storage.set(STORAGE_KEYS.users, JSON.stringify(db));

export const loadSession = () => storage.get(STORAGE_KEYS.session) || null;

export const saveSession = (mobile) => storage.set(STORAGE_KEYS.session, mobile || '');

export function createUserRecord(mobile, name, role) {
  return { mobile, name, role: role || 'other', plays: [], spins: {}, created: todayKey() };
}

/* ---------- language ---------- */

export function loadLang() {
  const v = storage.get(STORAGE_KEYS.lang);
  return v === 'en' || v === 'gu' ? v : 'hi';
}

export const saveLang = (lang) => storage.set(STORAGE_KEYS.lang, lang);
