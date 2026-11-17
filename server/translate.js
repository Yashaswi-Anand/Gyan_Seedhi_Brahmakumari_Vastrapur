/* Translate one quiz question into Hindi, English and Gujarati with Gemini.
   Runs on the server only (Netlify Function, or the Vite dev server locally), so the
   API key never reaches the browser. Used by netlify/functions/translate.mjs and vite.config.js. */
import { ApiError, BK_LANGUAGE_RULES, errorBody, generateContent, modelName, partsOf, stopReason, usageOf } from './gemini.js';
import { readJson, streamJsonResult } from './http.js';
import { assertWithinBudget, recordUsage } from './usage.js';

export const LANGS = ['hi', 'en', 'gu'];
const LIMITS = { q: 1000, opt: 200, hint: 500, exp: 1000, title: 120, opts: 4 };

const SYSTEM = `You translate quiz questions for a Brahma Kumaris (Rajyoga) centre's daily Murli quiz app.

Translate the given question into three languages.
${BK_LANGUAGE_RULES}

Rules:
- The source may be written in any one of these languages. For that language, return the text unchanged.
- "opts" must have exactly as many items as the input, in the same order. Never reorder options.
- If an input field is empty, return an empty string for it in every language.
- Return only the JSON described by the schema.`;

const versionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['q', 'opts', 'hint', 'exp', 'title'],
  properties: {
    q: { type: 'string' },
    opts: { type: 'array', items: { type: 'string' } },
    hint: { type: 'string' },
    exp: { type: 'string' },
    title: { type: 'string' },
  },
};

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: LANGS,
  properties: Object.fromEntries(LANGS.map((l) => [l, versionSchema])),
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Accept only the fields we translate, trimmed and size-capped (keeps cost per call small). */
export function cleanInput(body) {
  const src = body && typeof body === 'object' ? body : {};
  const opts = Array.isArray(src.opts) ? src.opts.slice(0, LIMITS.opts).map((o) => str(o, LIMITS.opt)) : [];
  const input = {
    q: str(src.q, LIMITS.q),
    opts,
    hint: str(src.hint, LIMITS.hint),
    exp: str(src.exp, LIMITS.exp),
    title: str(src.title, LIMITS.title),
  };
  if (!input.q) throw new ApiError(400, 'empty', 'Question text is required.');
  return input;
}

/** Calls Gemini and returns { hi, en, gu }, each { q, opts, hint, exp, title }. */
export async function translateQuestion(body, { apiKey, dev = false } = {}) {
  const input = cleanInput(body);
  if (!apiKey) throw new ApiError(500, 'no_key', 'The Gemini service is not set up.');
  await assertWithinBudget({ dev }); // the teacher's weekly limit

  const model = modelName();
  const data = await generateContent(
    apiKey,
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
      generationConfig: {
        maxOutputTokens: 8000,
        responseMimeType: 'application/json',
        responseJsonSchema: OUTPUT_SCHEMA,
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    },
    { model },
  );
  await recordUsage(data.modelUsed || model, usageOf(data), { dev });

  const parts = partsOf(data);
  const reason = stopReason(data, parts);
  if (reason === 'refusal') throw new ApiError(422, 'refusal', 'This text could not be translated.');
  if (reason === 'max_tokens') {
    throw new ApiError(502, 'truncated', 'The translation was cut off. Please shorten the text.');
  }
  let out;
  try {
    out = JSON.parse(
      parts
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join(''),
    );
  } catch {
    throw new ApiError(502, 'bad_output', 'The translation came back in an unexpected format.');
  }

  // keep options aligned with the input: same count, same order
  for (const l of LANGS) {
    const v = out[l] || {};
    const opts = Array.isArray(v.opts) ? v.opts : [];
    out[l] = {
      q: String(v.q || ''),
      opts: input.opts.map((_, i) => String(opts[i] ?? '')),
      hint: input.hint ? String(v.hint || '') : '',
      exp: input.exp ? String(v.exp || '') : '',
      title: input.title ? String(v.title || '') : '',
    };
  }
  return out;
}

/** POST /api/translate */
export async function handleTranslateRequest(request, { apiKey, dev = false } = {}) {
  const { body, error } = await readJson(request, 20000);
  if (error) return error;
  return streamJsonResult(() => translateQuestion(body, { apiKey, dev }), errorBody);
}
