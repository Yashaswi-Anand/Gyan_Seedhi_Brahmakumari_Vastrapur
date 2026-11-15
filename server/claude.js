/* Shared Claude setup for the server endpoints (translate + Q/A chat). Server-side only. */
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';

/** Error with an HTTP-ish status and a short code the app understands. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const NO_KEY = () =>
  new ApiError(500, 'no_key', 'The Claude service is not set up (ANTHROPIC_API_KEY missing or invalid).');

/** The server always passes ANTHROPIC_API_KEY from its environment settings. */
export function makeClient(apiKey) {
  if (!apiKey) throw NO_KEY();
  return new Anthropic({ apiKey });
}

/** Turns SDK errors into ApiErrors (most specific first). */
export function mapClaudeError(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof Anthropic.AuthenticationError) return NO_KEY();
  if (err instanceof Anthropic.RateLimitError) {
    return new ApiError(429, 'busy', 'Too many requests right now. Please try again in a minute.');
  }
  if (err instanceof Anthropic.APIError) {
    return new ApiError(502, 'api_error', `Claude request failed (${err.status ?? 'network'}).`);
  }
  console.error('Claude call failed', err);
  return new ApiError(500, 'server_error', 'Something went wrong.');
}

export const errorBody = (err) => {
  const e = mapClaudeError(err);
  return { error: e.code, message: e.message };
};

/** Request options every call shares: refusal fallback (opt-in, routed by category). */
export const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export const BK_LANGUAGE_RULES = `Languages:
- "hi": Hindi in Devanagari script
- "en": English
- "gu": Gujarati in Gujarati script
Use the terms Brahma Kumaris students use. In English keep: Murli, Baba, BapDada, Shiv Baba, Amrit Vela, Rajyoga, yoga, soul, Supreme Soul, sanskars, vardan (blessing), Madhuban, drill, avyakt, ashariri (bodiless), traffic control. In Gujarati use the usual Gujarati spelling of the same terms (મુરલી, બાબા, બાપદાદા, અમૃતવેલા).
Keep blanks like "______", quotation marks, numbers, times (4:30) and punctuation in the same places. Keep the meaning exact: this is spiritual study material, so do not add, drop or soften anything.`;
