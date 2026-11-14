/* Translation engine.
   The app is written in Hindi. For English / Gujarati each Hindi string is looked up in the
   locale dictionary. If the whole string is not a key, every key found inside it is replaced
   (longest first), so composed strings such as "आज के अंक 120 / 200" still translate. */
import en from './locales/en.json';
import gu from './locales/gu.json';

const DICTS = { en, gu };
const KEYS = Object.fromEntries(
  Object.entries(DICTS).map(([lang, d]) => [lang, Object.keys(d).sort((a, b) => b.length - a.length)]),
);
const cache = { en: new Map(), gu: new Map() };

export function translate(lang, text) {
  if (text == null) return '';
  const s = String(text);
  if (lang === 'hi' || !DICTS[lang]) return s;
  const dict = DICTS[lang];
  if (dict[s] != null) return dict[s];
  const c = cache[lang];
  if (c.has(s)) return c.get(s);
  let out = s;
  for (const k of KEYS[lang]) {
    if (out.indexOf(k) > -1) out = out.split(k).join(dict[k]);
  }
  c.set(s, out);
  return out;
}

/** Names are translated only when the whole name is a known key (demo names). */
export function translateName(lang, name) {
  const s = String(name ?? '');
  if (lang === 'hi' || !DICTS[lang]) return s;
  return DICTS[lang][s] ?? s;
}

/** True if the exact string is a dictionary key (used by the data check script). */
export const hasKey = (lang, s) => DICTS[lang]?.[s] != null;
