/* Shared Gemini setup for the server endpoints (translate + Q/A chat). Server-side only.
   Calls the Gemini API (generateContent) over REST; the key never reaches the browser. */

/** Default model; GEMINI_MODEL in the environment overrides it. */
export const DEFAULT_MODEL = 'gemini-4-hydrogen';
export const modelName = () => (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 120000;

/** Error with an HTTP-ish status and a short code the app understands. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const NO_KEY = () =>
  new ApiError(500, 'no_key', 'The Gemini service is not set up (GEMINI_API_KEY missing or invalid).');

/** Maps a Gemini HTTP error to an ApiError. */
function httpError(status, body) {
  const reason = JSON.stringify(body?.error?.details || '') + String(body?.error?.message || '');
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|API key expired/i.test(reason)) return NO_KEY();
  if (status === 429) return new ApiError(429, 'busy', 'Too many requests right now. Please try again in a minute.');
  if (status === 400) return new ApiError(502, 'api_error', `Gemini rejected the request: ${body?.error?.message || 'bad request'}`);
  return new ApiError(502, 'api_error', `Gemini request failed (${status}).`);
}

/** One generateContent call. Returns { res, data }; drops the thinking level if the model refuses it. */
async function postGenerate(apiKey, body, model) {
  let res;
  try {
    res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('Gemini call failed', err);
    throw new ApiError(502, 'api_error', 'Gemini could not be reached.');
  }
  const data = await res.json().catch(() => ({}));
  // a model that doesn't take this thinking level: ask again with its default thinking
  if (res.status === 400 && body.generationConfig?.thinkingConfig && /thinking/i.test(data?.error?.message || '')) {
    const { thinkingConfig: _drop, ...generationConfig } = body.generationConfig;
    return postGenerate(apiKey, { ...body, generationConfig }, model);
  }
  return { res, data };
}

/* When the chosen model is down (503 / 500 / 504), out of quota (429) or gone (404), another Gemini model the key
   can use answers instead, and is remembered for a while so the next calls go straight to it. */
// 429 too: a model can be out of quota (on the free tier some have none) while another still has some
const SKIP = new Set([404, 429, 500, 503, 504]);
const FALLBACK_TTL_MS = 30 * 60 * 1000;
const MAX_FALLBACKS = 5;
let fallback = null; // { from, model, until }
let modelList = null; // { names, until }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Text-chat Gemini models this key can call, best first (newest version, flash before pro, stable before preview). */
async function fallbackModels(apiKey, exclude) {
  if (!modelList || modelList.until < Date.now()) {
    let names = [];
    try {
      const res = await fetch(`${BASE}/models?pageSize=1000`, {
        headers: { 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => ({}));
      names = (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m) => String(m.name || '').replace(/^models\//, ''))
        .filter((n) => /^gemini-\d/.test(n) && !/image|tts|audio|live|embed|vision|robotic|computer|nano|aqa|learnlm|exp/i.test(n));
    } catch (err) {
      console.error('Gemini model list failed', err);
    }
    const version = (n) => parseFloat(n.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] || '0');
    const rank = (n) => (/flash/.test(n) ? 0 : /pro/.test(n) ? 1 : 2) + (/lite/.test(n) ? 1 : 0) + (/preview/.test(n) ? 0.5 : 0);
    names.sort((a, b) => version(b) - version(a) || rank(a) - rank(b) || a.localeCompare(b));
    modelList = { names, until: Date.now() + (names.length ? FALLBACK_TTL_MS : 60000) };
  }
  const extra = (process.env.GEMINI_FALLBACK_MODEL || '').trim();
  return [...new Set([extra, ...modelList.names].filter((n) => n && n !== exclude))];
}

/**
 * POST models/{model}:generateContent. Returns the parsed response, with `modelUsed` set to the
 * model that answered (it differs from `model` when that one was unavailable).
 */
export async function generateContent(apiKey, body, { model = modelName() } = {}) {
  if (!apiKey) throw NO_KEY();
  const sticky = fallback && fallback.from === model && fallback.until > Date.now() ? fallback.model : null;
  const tried = new Set();
  const attempt = async (m) => {
    tried.add(m);
    const out = await postGenerate(apiKey, body, m);
    if (out.res.ok) out.data.modelUsed = m;
    return out;
  };

  const log = []; // "model 503" for each failed try, for the error message
  const tryModel = async (m) => {
    const out = await attempt(m);
    if (!out.res.ok) log.push(`${m} ${out.res.status}`);
    return out;
  };

  let { res, data } = await tryModel(sticky || model);
  if (sticky && !res.ok && SKIP.has(res.status)) {
    fallback = null; // the remembered model can't answer either: start again from the chosen one
    ({ res, data } = await tryModel(model));
  }
  // a short hiccup: one quick retry on the chosen model
  if (!res.ok && [500, 503, 504].includes(res.status)) {
    await sleep(1500);
    ({ res, data } = await tryModel(model));
  }
  if (!res.ok && SKIP.has(res.status)) {
    console.error('Gemini model unavailable', model, res.status, data?.error?.message);
    for (const m of (await fallbackModels(apiKey, model)).filter((n) => !tried.has(n)).slice(0, MAX_FALLBACKS)) {
      ({ res, data } = await tryModel(m));
      if (res.ok) {
        console.warn(`Gemini: ${model} unavailable, answered with ${m}`);
        fallback = { from: model, model: m, until: Date.now() + FALLBACK_TTL_MS };
        break;
      }
      if (!SKIP.has(res.status)) break; // a real error from this model: report it
    }
  }
  if (!res.ok) {
    console.error('Gemini error', log.join(', '), data?.error?.message);
    // no model could answer (down, or out of quota): "busy", try again in a minute
    if (SKIP.has(res.status)) throw new ApiError(503, 'busy', `Gemini could not answer right now (${log.join(', ')}).`);
    const err = httpError(res.status, data);
    err.message += ` [${log.join(', ')}]`;
    throw err;
  }
  return data;
}

/**
 * Checks a key with a free call (lists models).
 * Returns null when it works, 'invalid_key' or 'check_failed'.
 */
export async function verifyKey(apiKey) {
  try {
    const res = await fetch(`${BASE}/models?pageSize=1`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return null;
    return [400, 401, 403].includes(res.status) ? 'invalid_key' : 'check_failed';
  } catch {
    return 'check_failed';
  }
}

const BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'LANGUAGE']);

/** Why the answer ended: 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal'. */
export function stopReason(data, parts) {
  if (data?.promptFeedback?.blockReason) return 'refusal';
  const finish = data?.candidates?.[0]?.finishReason;
  if (parts.some((p) => p.functionCall)) return 'tool_use';
  if (BLOCKED.has(finish)) return 'refusal';
  if (finish === 'MAX_TOKENS') return 'max_tokens';
  return 'end_turn';
}

/** The answer's parts (thought summaries included, if any). */
export const partsOf = (data) => data?.candidates?.[0]?.content?.parts || [];

/** usageMetadata → the token counts the weekly usage record keeps. */
export function usageOf(data) {
  const u = data?.usageMetadata || {};
  const cached = u.cachedContentTokenCount || 0;
  return {
    input_tokens: Math.max(0, (u.promptTokenCount || 0) + (u.toolUsePromptTokenCount || 0) - cached),
    cache_read_input_tokens: cached,
    output_tokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
  };
}

export const errorBody = (err) => {
  const e = err instanceof ApiError ? err : null;
  if (!e) console.error('AI call failed', err);
  return e ? { error: e.code, message: e.message } : { error: 'server_error', message: 'Something went wrong.' };
};

export { BK_LANGUAGE_RULES } from './languageRules.js';
