/* POST /api/settings – the Gemini API key used by the AI features, and the weekly limit.
   The key is stored on the server only; the app only ever sees its last 4 characters.
   Changing it needs the settings PIN (created the first time a key is saved), checked here
   on the server, with a lock-out after repeated wrong PINs. */
import { verifyKey } from './gemini.js';
import { json, readJson } from './http.js';
import { hashPin, pinMatches, readSettings, writeSettings } from './secrets.js';
import { budgetStatus } from './usage.js';

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const PIN_RE = /^\d{4,8}$/;

const last4 = (k) => (k ? k.slice(-4) : '');

function status(s, envKey) {
  const source = s.geminiKey ? 'app' : envKey ? 'netlify' : null;
  return {
    configured: !!source,
    source,
    last4: last4(s.geminiKey || envKey),
    pinSet: !!s.pinHash,
    updatedAt: s.updatedAt || null,
  };
}

/** Parses the weekly limit in USD: null / 0 removes it; otherwise 0.5 to 1000. */
function parseLimit(v) {
  if (v === null || v === '' || Number(v) === 0) return { limit: null };
  const n = Math.round(Number(v) * 100) / 100;
  if (!Number.isFinite(n) || n < 0.5 || n > 1000) return { error: 'bad_limit' };
  return { limit: n };
}

/** Verifies the PIN with lock-out. Returns an error Response, or null when the PIN is right. */
async function checkPin(s, pin, opts) {
  const now = Date.now();
  if (s.lockedUntil && s.lockedUntil > now) {
    return json(429, { error: 'locked', minutes: Math.ceil((s.lockedUntil - now) / 60000) });
  }
  if (pinMatches(pin, s)) {
    if (s.fails) await writeSettings({ ...s, fails: 0, lockedUntil: null }, opts);
    return null;
  }
  const fails = (s.fails || 0) + 1;
  const locked = fails >= MAX_FAILS;
  await writeSettings({ ...s, fails: locked ? 0 : fails, lockedUntil: locked ? now + LOCK_MS : null }, opts);
  return json(403, { error: locked ? 'locked' : 'wrong_pin', triesLeft: locked ? 0 : MAX_FAILS - fails, minutes: locked ? 15 : 0 });
}

export async function handleSettingsRequest(request, { dev = false, envKey = '' } = {}) {
  const { body, error } = await readJson(request, 4000);
  if (error) return error;
  const opts = { dev };
  const reply = async (st) => json(200, { ...status(st, envKey), budget: await budgetStatus(opts).catch(() => null) });
  let s;
  try {
    s = await readSettings(opts);
  } catch (err) {
    console.error('settings store unavailable', err);
    return json(503, { error: 'store_unavailable' });
  }

  switch (body?.action) {
    case 'status':
      return reply(s);

    case 'set_key': {
      const key = String(body.key || '').trim();
      if (!/^[A-Za-z0-9._-]{30,200}$/.test(key)) return json(400, { error: 'bad_key_format' });
      if (s.pinHash) {
        const denied = await checkPin(s, body.pin, opts);
        if (denied) return denied;
      } else if (!PIN_RE.test(String(body.newPin || ''))) {
        return json(400, { error: 'pin_required' }); // first time: create a PIN with the key
      }
      const problem = await verifyKey(key);
      if (problem) return json(400, { error: problem });
      const next = { ...(await readSettings(opts)), geminiKey: key, updatedAt: new Date().toISOString(), fails: 0, lockedUntil: null };
      if (!s.pinHash || PIN_RE.test(String(body.newPin || ''))) {
        const { salt, hash } = hashPin(body.newPin);
        next.pinSalt = salt;
        next.pinHash = hash;
      }
      await writeSettings(next, opts);
      return reply(next);
    }

    case 'change_pin': {
      if (!s.pinHash) return json(400, { error: 'no_pin' });
      if (!PIN_RE.test(String(body.newPin || ''))) return json(400, { error: 'bad_pin_format' });
      const denied = await checkPin(s, body.pin, opts);
      if (denied) return denied;
      const { salt, hash } = hashPin(body.newPin);
      const next = { ...(await readSettings(opts)), pinSalt: salt, pinHash: hash };
      await writeSettings(next, opts);
      return reply(next);
    }

    case 'remove_key': {
      if (!s.pinHash) return json(400, { error: 'no_pin' });
      const denied = await checkPin(s, body.pin, opts);
      if (denied) return denied;
      const { geminiKey: _removed, ...rest } = await readSettings(opts);
      const next = { ...rest, updatedAt: new Date().toISOString() };
      await writeSettings(next, opts);
      return reply(next);
    }

    case 'set_limit': {
      const { limit, error: bad } = parseLimit(body.limitUsd);
      if (bad) return json(400, { error: bad });
      if (s.pinHash) {
        const denied = await checkPin(s, body.pin, opts);
        if (denied) return denied;
      } else if (!PIN_RE.test(String(body.newPin || ''))) {
        return json(400, { error: 'pin_required' }); // no PIN yet: create one with the limit
      }
      const next = { ...(await readSettings(opts)), weeklyLimitUsd: limit };
      if (!s.pinHash) {
        const { salt, hash } = hashPin(body.newPin);
        next.pinSalt = salt;
        next.pinHash = hash;
      }
      await writeSettings(next, opts);
      return reply(next);
    }

    default:
      return json(400, { error: 'unknown_action' });
  }
}
