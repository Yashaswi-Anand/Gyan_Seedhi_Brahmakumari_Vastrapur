/* Checks that every Hindi string in the app translates fully into English and Gujarati.
   Run: npm run check:i18n
   Reports any string that would still contain Devanagari after translation. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const load = (l) => JSON.parse(fs.readFileSync(path.join(src, 'i18n/locales', l + '.json'), 'utf8'));
const DICTS = { en: load('en'), gu: load('gu') };
const DEVANAGARI = /[ऀ-ॿ]/;

function translate(lang, s) {
  const d = DICTS[lang];
  if (d[s] != null) return d[s];
  let out = s;
  for (const k of Object.keys(d).sort((a, b) => b.length - a.length)) if (out.includes(k)) out = out.split(k).join(d[k]);
  return out;
}

const strings = new Map(); // text -> where
const add = (s, where) => {
  if (typeof s === 'string' && DEVANAGARI.test(s) && !strings.has(s)) strings.set(s, where);
};

// 1) data files
const { MURLI_QUESTIONS, CHART_QUESTIONS } = await import(pathToFileURL(path.join(src, 'data/questions.js')));
const { BADGES } = await import(pathToFileURL(path.join(src, 'data/badges.js')));
for (const q of MURLI_QUESTIONS) {
  [q.tag, q.q, q.hint, q.exp, q.life, ...(q.opts || [])].forEach((s) => add(s, 'data/questions.js'));
}
for (const c of CHART_QUESTIONS) [c.t, c.q].forEach((s) => add(s, 'data/questions.js'));
for (const b of BADGES) [b.t, b.d].forEach((s) => add(s, 'data/badges.js'));

// 2) t('…') / t(`…`) literals and Hindi message constants in components
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
  });
for (const file of walk(src)) {
  if (file.includes(path.join('src', 'data'))) continue;
  const rel = path.relative(src, file);
  const text = fs.readFileSync(file, 'utf8');
  // '…', `…` and "…" (JSX attributes such as title="…")
  for (const m of text.matchAll(
    /'([^'\n]*[ऀ-ॿ][^'\n]*)'|`([^`\n]*[ऀ-ॿ][^`\n]*)`|"([^"\n]*[ऀ-ॿ][^"\n]*)"/g,
  )) {
    add((m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, '0'), rel);
  }
}

// Strings intentionally kept in Hindi (per-language objects or language-specific branches)
const SKIP = [/^मुरली$|^चार्ट$/, /में से .* उत्तर पहली बार में सही|में से रैंक/, /^[अक-ह]$/, /^[१२]$/, /^हिन्दी$/];
const SKIP_FILES = ['vardans.js', 'calendar.js', 'date.js'];

let missing = 0;
for (const [s, where] of strings) {
  if (SKIP_FILES.some((f) => where.endsWith(f)) || SKIP.some((r) => r.test(s))) continue;
  for (const lang of ['en', 'gu']) {
    const out = translate(lang, s);
    if (lang === 'en' ? DEVANAGARI.test(out) : out === s) {
      missing++;
      console.log(`[${lang}] ${where}: ${s}\n      -> ${out}`);
    }
  }
}
console.log(missing ? `\n${missing} untranslated string(s).` : `All ${strings.size} Hindi strings translate.`);
process.exitCode = missing ? 1 : 0;
