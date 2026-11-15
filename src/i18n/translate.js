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

/* ---------- question translations from Firestore ----------
   Questions the teacher adds carry their own translations (`i18n.hi / en / gu`, made with
   Claude and reviewed by the teacher). When questions load, each source text is registered
   here against its translations, so every screen that shows question text finds it. */
const contentMaps = { hi: new Map(), en: new Map(), gu: new Map() };

export function registerQuestionTranslations(docs) {
  for (const d of docs || []) {
    if (!d?.i18n) continue;
    for (const lang of Object.keys(contentMaps)) {
      const v = d.i18n[lang];
      if (!v) continue;
      const put = (src, out) => {
        if (src && out) contentMaps[lang].set(String(src), String(out));
      };
      put(d.q, v.q);
      put(d.hint, v.hint);
      put(d.exp, v.exp);
      put(d.title, v.title);
      (d.opts || []).forEach((o, i) => put(o, v.opts?.[i]));
    }
  }
}

/**
 * Exact-match translation (names and question content): a registered question translation,
 * then the built-in dictionary, otherwise the text unchanged.
 */
export function translateName(lang, name) {
  const s = String(name ?? '');
  const registered = contentMaps[lang]?.get(s);
  if (registered) return registered;
  if (lang === 'hi' || !DICTS[lang]) return s;
  return DICTS[lang][s] ?? s;
}

/** True if the exact string is a dictionary key (used by the data check script). */
export const hasKey = (lang, s) => DICTS[lang]?.[s] != null;
