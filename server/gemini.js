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

/** POST models/{model}:generateContent. Returns the parsed response. */
export async function generateContent(apiKey, body, { model = modelName() } = {}) {
  if (!apiKey) throw NO_KEY();
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
    return generateContent(apiKey, { ...body, generationConfig }, { model });
  }
  if (!res.ok) {
    console.error('Gemini error', res.status, data?.error?.message);
    throw httpError(res.status, data);
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

export const BK_LANGUAGE_RULES = `Languages:
- "hi": Hindi in Devanagari script
- "en": English
- "gu": Gujarati in Gujarati script
Use the terms Brahma Kumaris students use. In English keep: Murli, Baba, BapDada, Shiv Baba, Amrit Vela, Rajyoga, yoga, soul, Supreme Soul, sanskars, vardan (blessing), Madhuban, drill, avyakt, ashariri (bodiless), traffic control. In Gujarati use the usual Gujarati spelling of the same terms (મુરલી, બાબા, બાપદાદા, અમૃતવેલા).
Keep blanks like "______", quotation marks, numbers, times (4:30) and punctuation in the same places. Keep the meaning exact: this is spiritual study material, so do not add, drop or soften anything.`;
