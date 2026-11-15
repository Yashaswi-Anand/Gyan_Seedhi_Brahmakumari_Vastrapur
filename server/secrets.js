/* Server-only storage: the Claude API key, the settings PIN, the weekly limit and usage.
   - On Netlify: Netlify Blobs (private to the site's functions; never sent to browsers)
   - Local dev:  .data/<name>.json (git-ignored)
   The key set in the app's Settings tab wins; otherwise ANTHROPIC_API_KEY from the
   environment is used. */
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SETTINGS = 'claude-settings';

async function blobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'gyan-seedhi-secrets', consistency: 'strong' });
}

const devFile = (name) => path.resolve('.data', `${name}.json`);

export async function readBlob(name, { dev = false } = {}) {
  if (dev) {
    try {
      return JSON.parse(fs.readFileSync(devFile(name), 'utf8'));
    } catch {
      return {};
    }
  }
  return (await (await blobStore()).get(name, { type: 'json' })) || {};
}

export async function writeBlob(name, data, { dev = false } = {}) {
  if (dev) {
    fs.mkdirSync(path.dirname(devFile(name)), { recursive: true });
    fs.writeFileSync(devFile(name), JSON.stringify(data, null, 2));
    return;
  }
  await (await blobStore()).setJSON(name, data);
}

/** { apiKey?, pinHash?, pinSalt?, fails?, lockedUntil?, weeklyLimitUsd?, updatedAt? } */
export const readSettings = (opts) => readBlob(SETTINGS, opts);
export const writeSettings = (data, opts) => writeBlob(SETTINGS, data, opts);

/** The key the Claude endpoints should use: the one set in the app, else the environment variable. */
export async function getClaudeKey({ dev = false, envKey = '' } = {}) {
  try {
    const s = await readSettings({ dev });
    if (s.apiKey) return s.apiKey;
  } catch (err) {
    console.error('could not read settings store', err);
  }
  return envKey || '';
}

export function hashPin(pin, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(String(pin), salt, 32).toString('hex') };
}

export function pinMatches(pin, settings) {
  if (!settings.pinHash || !settings.pinSalt) return false;
  const { hash } = hashPin(pin, settings.pinSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(settings.pinHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
