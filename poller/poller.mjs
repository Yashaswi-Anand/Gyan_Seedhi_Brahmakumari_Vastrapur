/* Gyan Seedhi – AI chat poller for the VPS (Claude Code CLI on the Claude Max plan).

   Watches Firestore ai_jobs for "pending" turns (written by /api/qa-chat on Netlify), claims each one in a
   transaction so two pollers never answer the same turn, runs ONE assistant turn with `claude -p`, and writes
   the answer back. Outbound connections only: nothing listens on a port.

   Env:
     GOOGLE_APPLICATION_CREDENTIALS  path to the Firebase service-account JSON (required, unless FIRESTORE_EMULATOR_HOST)
     CLAUDE_CODE_OAUTH_TOKEN         Max-plan login from `claude setup-token`
     CLAUDE_MODEL                    model for the chat (default: sonnet)
     CLAUDE_BIN                      the claude command (default: claude)
     POLLER_CONCURRENCY              turns answered at the same time (default: 2)
     POLLER_NAME                     name in ai_workers (default: the host name)
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { answerSchema, blocksFromAnswer, systemPrompt, todayOf, turnPrompt } from '../server/claudeTurn.js';

const JOBS = 'ai_jobs';
const WORKERS = 'ai_workers';
const MODEL = process.env.CLAUDE_MODEL || 'sonnet';
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const CONCURRENCY = Math.max(1, Number(process.env.POLLER_CONCURRENCY || 2));
const NAME = process.env.POLLER_NAME || os.hostname();
const TURN_TIMEOUT_MS = 4 * 60 * 1000;
const STALE_MS = 10 * 60 * 1000; // a job "processing" longer than this lost its poller: put it back
const KEEP_JOBS_MS = 2 * 24 * 3600 * 1000;
const HOME = path.join(os.homedir(), '.gyan-seedhi-poller');
const SCHEMA = JSON.stringify(answerSchema());

const log = (...a) => console.log(new Date().toISOString(), ...a);

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: process.env.FIREBASE_PROJECT_ID || 'gyan-seedhi' } : { credential: applicationDefault() });
const db = getFirestore();

let busy = 0;
const queue = []; // job ids seen as pending, waiting for a free slot
const seen = new Set();

/** Runs `claude -p` once; resolves with its parsed JSON output. Each slot has its own config folder. */
function runClaude(slot, system, prompt) {
  const dir = path.join(HOME, `w${slot}`);
  fs.mkdirSync(dir, { recursive: true });
  const sysFile = path.join(dir, 'system.txt');
  fs.writeFileSync(sysFile, system);
  const args = [
    '-p', '--model', MODEL,
    '--tools', '', // no built-in tools: no shell, files or web — Claude only answers
    '--no-session-persistence',
    '--setting-sources', '',
    '--system-prompt-file', sysFile,
    '--output-format', 'json',
    '--json-schema', SCHEMA,
  ];
  return new Promise((resolve, reject) => {
    // CLAUDE_BIN may be a .mjs stand-in (tests only)
    const [cmd, argv] = /\.m?js$/.test(CLAUDE) ? [process.execPath, [CLAUDE, ...args]] : [CLAUDE, args];
    const child = spawn(cmd, argv, { cwd: dir, env: { ...process.env, CLAUDE_CONFIG_DIR: path.join(dir, 'config') } });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error('Claude took too long'), { code: 'ai_timeout' }));
    }, TURN_TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(Object.assign(e, { code: 'ai_failed' }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      let j = null;
      try {
        j = JSON.parse(out);
      } catch {
        /* not JSON */
      }
      if (!j) return reject(Object.assign(new Error(`claude exited ${code}: ${(err || out).slice(0, 300)}`), { code: 'ai_failed' }));
      if (j.is_error) {
        const msg = String(j.result || j.subtype || 'error');
        const limit = /limit|quota|usage/i.test(msg);
        return reject(Object.assign(new Error(msg.slice(0, 300)), { code: limit ? 'ai_busy' : 'ai_failed' }));
      }
      resolve(j);
    });
    child.stdin.end(prompt);
  });
}

/** One assistant turn for a job's messages: { content, stop_reason }. One retry on a bad answer. */
async function answer(slot, messages, today, jobId) {
  const system = systemPrompt(today);
  const prompt = turnPrompt(messages);
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const j = await runClaude(slot, system, prompt);
      return { ...blocksFromAnswer(j.structured_output, jobId.slice(0, 8) + attempt), secs: (j.duration_ms || 0) / 1000 };
    } catch (err) {
      lastErr = err;
      if (err.code === 'ai_busy' || err.code === 'ai_timeout') break; // retrying would not help
      log(`job ${jobId} attempt ${attempt} failed: ${err.message}`);
    }
  }
  throw lastErr;
}

/** Claims a pending job (transaction). Returns its data, or null if someone else took it. */
async function claim(id) {
  const ref = db.collection(JOBS).doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get('status') !== 'pending') return null;
    tx.update(ref, { status: 'processing', claimedBy: NAME, claimedAt: Timestamp.now() });
    return snap.data();
  });
}

async function work(slot, id) {
  const ref = db.collection(JOBS).doc(id);
  let data;
  try {
    data = await claim(id);
  } catch (err) {
    log(`job ${id}: claim failed`, err.message);
    return;
  }
  if (!data) return;
  const t0 = Date.now();
  try {
    const messages = JSON.parse(gunzipSync(Buffer.from(data.messagesGz)).toString('utf8'));
    const r = await answer(slot, messages, todayOf(data.today), id);
    await ref.update({
      status: 'done',
      finished: Timestamp.now(),
      model: MODEL,
      resultJson: JSON.stringify({ content: r.content, stop_reason: r.stop_reason }),
    });
    const tools = r.content.filter((b) => b.type === 'tool_use').map((b) => b.name);
    log(`job ${id} done in ${((Date.now() - t0) / 1000).toFixed(1)} s${tools.length ? ' · tools ' + tools.join(',') : ''}`);
  } catch (err) {
    log(`job ${id} failed (${err.code || 'ai_failed'}): ${err.message}`);
    const message =
      err.code === 'ai_busy' ? 'Claude is busy (plan limit reached). Please try again later.' : err.code === 'ai_timeout' ? 'Claude took too long.' : 'Claude could not answer.';
    await ref.update({ status: 'error', finished: Timestamp.now(), errorCode: err.code || 'ai_failed', errorMessage: message }).catch(() => {});
  }
}

const freeSlots = Array.from({ length: CONCURRENCY }, (_, i) => i); // each slot = its own claude config folder

function pump() {
  while (freeSlots.length && queue.length) {
    const id = queue.shift();
    const slot = freeSlots.shift();
    busy++;
    work(slot, id).finally(() => {
      busy--;
      freeSlots.push(slot);
      seen.delete(id);
      pump();
    });
  }
}

function watch() {
  db.collection(JOBS)
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        for (const d of snap.docs) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);
          queue.push(d.id);
        }
        pump();
      },
      (err) => {
        log('watch failed, retrying in 10 s:', err.message);
        setTimeout(watch, 10000);
      },
    );
}

async function heartbeat() {
  try {
    await db.collection(WORKERS).doc(NAME).set({ lastSeen: Timestamp.now(), model: MODEL, busy, concurrency: CONCURRENCY });
  } catch (err) {
    log('heartbeat failed:', err.message);
  }
}

/** Puts jobs whose poller died back in the queue, and removes old jobs. */
async function tidy() {
  try {
    const now = Date.now();
    const stuck = await db.collection(JOBS).where('status', '==', 'processing').get();
    for (const d of stuck.docs) {
      if (now - (d.get('claimedAt')?.toMillis?.() || 0) > STALE_MS) {
        await d.ref.update({ status: 'pending', claimedBy: null });
        log(`job ${d.id} was stuck, back in the queue`);
      }
    }
    const old = await db.collection(JOBS).where('created', '<', Timestamp.fromMillis(now - KEEP_JOBS_MS)).limit(200).get();
    for (const d of old.docs) await d.ref.delete();
    if (old.size) log(`removed ${old.size} old jobs`);
  } catch (err) {
    log('tidy failed:', err.message);
  }
}

async function shutdown() {
  log('stopping');
  await db.collection(WORKERS).doc(NAME).delete().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

log(`Gyan Seedhi poller "${NAME}" starting · model ${MODEL} · ${CONCURRENCY} at a time`);
await heartbeat();
setInterval(heartbeat, 20 * 1000);
await tidy();
setInterval(tidy, 5 * 60 * 1000);
watch();
