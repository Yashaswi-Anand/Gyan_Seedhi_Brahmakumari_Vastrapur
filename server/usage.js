/* Weekly AI (Gemini) usage and the teacher's weekly limit.
   An API key can't read its own bill, so the app records the tokens of every Gemini call it
   makes and estimates the cost itself, at paid-tier prices. On Google's free tier the real
   cost is zero; the estimate then shows what the same use would cost on the paid tier.
   Weeks run Monday–Sunday, India time. */
import { ApiError } from './gemini.js';
import { readBlob, readSettings, writeBlob } from './secrets.js';

const USAGE = 'claude-usage';
const KEEP_WEEKS = 12;
export const WARN_AT = 0.8; // warn at 80% of the weekly limit

/** USD per million tokens, paid tier (output includes thinking). Cached input ≈ 10% of input. */
const PRICES = {
  'gemini-4-hydrogen': { input: 1.5, output: 7.5, cacheRead: 0.15, cacheWrite: 0 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5, cacheRead: 0.03, cacheWrite: 0 },
};
const DEFAULT_PRICE = PRICES['gemini-4-hydrogen'];

/** Monday (YYYY-MM-DD) of the current week in India time. */
export function weekStart(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const sinceMonday = (ist.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - sinceMonday))
    .toISOString()
    .slice(0, 10);
}

/** Approximate cost in USD of one response's `usage`. */
export function costOf(model, usage = {}) {
  const p = PRICES[model] || DEFAULT_PRICE;
  const m = 1e6;
  return (
    ((usage.input_tokens || 0) * p.input +
      (usage.output_tokens || 0) * p.output +
      (usage.cache_read_input_tokens || 0) * p.cacheRead +
      (usage.cache_creation_input_tokens || 0) * p.cacheWrite) /
    m
  );
}

/** Adds one AI response to this week's totals. Never fails the request. */
export async function recordUsage(model, usage, opts) {
  try {
    const data = await readBlob(USAGE, opts);
    const weeks = data.weeks || {};
    const wk = weekStart();
    const w = weeks[wk] || { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    w.requests += 1;
    w.inputTokens += (usage?.input_tokens || 0) + (usage?.cache_read_input_tokens || 0) + (usage?.cache_creation_input_tokens || 0);
    w.outputTokens += usage?.output_tokens || 0;
    w.costUsd = Math.round((w.costUsd + costOf(model, usage)) * 10000) / 10000;
    weeks[wk] = w;
    const keep = Object.keys(weeks).sort().slice(-KEEP_WEEKS);
    await writeBlob(USAGE, { weeks: Object.fromEntries(keep.map((k) => [k, weeks[k]])) }, opts);
  } catch (err) {
    console.error('could not record usage', err);
  }
}

/** This week's usage against the limit. pct is null when no limit is set. */
export async function budgetStatus(opts) {
  const [data, settings] = await Promise.all([readBlob(USAGE, opts), readSettings(opts)]);
  const wk = weekStart();
  const w = data.weeks?.[wk] || { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const limitUsd = Number(settings.weeklyLimitUsd) > 0 ? Number(settings.weeklyLimitUsd) : null;
  return {
    weekStart: wk,
    requests: w.requests,
    inputTokens: w.inputTokens,
    outputTokens: w.outputTokens,
    costUsd: w.costUsd,
    limitUsd,
    pct: limitUsd ? Math.round((w.costUsd / limitUsd) * 100) : null,
    warn: !!limitUsd && w.costUsd >= limitUsd * WARN_AT,
    reached: !!limitUsd && w.costUsd >= limitUsd,
  };
}

/** Stops an AI call when this week's limit is used up. Returns the current status. */
export async function assertWithinBudget(opts) {
  let b;
  try {
    b = await budgetStatus(opts);
  } catch (err) {
    console.error('could not read budget', err);
    return null; // storage trouble shouldn't block the teacher
  }
  if (b.reached) {
    throw new ApiError(429, 'weekly_limit', `This week's AI limit ($${b.limitUsd}) has been used.`);
  }
  return b;
}
