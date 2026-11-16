/* POST /api/murli – fetches one day's official murli from madhubanmurli.org as plain text.
   Runs on the server (the site doesn't allow the browser to fetch it directly).
   File layout on the site: /murlis/{lang}/html/murli-YYYY-MM-DD.html (past dates back to
   2020 and upcoming dates are published). */
import { json, readJson } from './http.js';

const SITE = 'https://madhubanmurli.org';
const LANGS = { hi: 'Hindi', en: 'English', gu: 'Gujarati' };
const MAX_TEXT = 40000;

const LABELS = {
  'summary': '[सार / Essence]',
  'question-lbl': '[प्रश्न / Question]',
  'answer-lbl': '[उत्तर / Answer]',
  'song-lbl': '[गीत / Song]',
  'murli-body': '[मुरली / Murli]',
  'blessing-lbl': '[वरदान / Blessing]',
  'slogan-lbl': '[स्लोगन / Slogan]',
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Murli HTML → readable text with section labels. */
export function murliHtmlToText(html) {
  let s = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '');
  // mark the labelled sections so the AI knows which part is which
  for (const [cls, label] of Object.entries(LABELS)) {
    s = s.replace(new RegExp(`(<[^>]+class="[^"]*\\b${cls}\\b[^"]*"[^>]*>)`, 'g'), `\n${label}\n$1`);
  }
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d|table)>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  return decode(s)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

/** Returns { date, language, source, text } or throws { status, code }. */
export async function fetchMurli(date, lang = 'hi') {
  if (!isDate(date)) throw Object.assign(new Error('bad date'), { status: 400, code: 'bad_date' });
  if (!LANGS[lang]) throw Object.assign(new Error('bad language'), { status: 400, code: 'bad_language' });
  const url = `${SITE}/murlis/${lang}/html/murli-${date}.html`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'user-agent': 'GyanSeedhi-quiz/1.0 (Brahma Kumaris centre quiz app)', accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Object.assign(new Error('site unreachable'), { status: 502, code: 'site_unreachable' });
  }
  if (res.status === 404) throw Object.assign(new Error('not found'), { status: 404, code: 'not_found' });
  if (!res.ok) throw Object.assign(new Error('site error'), { status: 502, code: 'site_error' });
  const html = await res.text();
  // a real murli page has the murli body; anything else (error page, placeholder) is "not found"
  if (!/class="[^"]*\bmurli-body\b/.test(html)) {
    throw Object.assign(new Error('not a murli'), { status: 404, code: 'not_found' });
  }
  const text = murliHtmlToText(html).slice(0, MAX_TEXT);
  return { date, language: LANGS[lang], lang, source: url, text };
}

export async function handleMurliRequest(request) {
  const { body, error } = await readJson(request, 1000);
  if (error) return error;
  try {
    return json(200, await fetchMurli(String(body?.date || ''), String(body?.lang || 'hi')));
  } catch (err) {
    return json(err.status || 500, { error: err.code || 'server_error' });
  }
}
