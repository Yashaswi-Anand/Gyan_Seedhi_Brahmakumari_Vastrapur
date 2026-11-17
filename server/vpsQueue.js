/* The AI chat answered by Claude on the VPS (AI_PROVIDER=claude-vps), Netlify side.

   Browser ── POST /api/qa-chat ──► this file writes ai_jobs/{id} (status "pending") and answers { job } at once
   VPS poller (poller/poller.mjs) ── watches pending jobs, claims one, runs `claude -p`, writes the answer
   Browser ── GET /api/qa-chat?job=<id> every 2 s ──► this file reads the job and answers its status

   Firestore is used with the Admin SDK only (service account in FIREBASE_SERVICE_ACCOUNT), so the browser
   never reads or writes ai_jobs and firestore.rules need no change. The chat history is gzipped into the
   job (a long chat with several murlis would pass Firestore's 1 MB document limit as plain text). */
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { ApiError } from './gemini.js';
import { cleanMessages } from './qaChat.js';
import { todayOf } from './claudeTurn.js';

export const JOBS = 'ai_jobs';
export const WORKERS = 'ai_workers';
const META = 'ai_meta';
const WORKER_FRESH_MS = 90 * 1000; // a poller writes its heartbeat every 20 s
const DAILY_TURNS = Number(process.env.AI_DAILY_TURNS || 400); // AI turns per day (India date), all chats together

export const vpsEnabled = () => String(process.env.AI_PROVIDER || '').toLowerCase() === 'claude-vps';

let dbPromise = null;
/** Firestore through the Admin SDK (loaded only when this provider is used). */
export function adminDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');
      if (!getApps().length) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
        if (raw) initializeApp({ credential: cert(JSON.parse(raw)) });
        else if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'gyan-seedhi' });
        else throw new ApiError(500, 'no_service_account', 'FIREBASE_SERVICE_ACCOUNT is not set.');
      }
      return getFirestore();
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Is at least one VPS poller alive (heartbeat in the last 90 s)? */
async function pollerAlive(db, now = Date.now()) {
  const snap = await db.collection(WORKERS).get();
  return snap.docs.some((d) => now - (d.get('lastSeen')?.toMillis?.() || 0) < WORKER_FRESH_MS);
}

/** Counts this turn against the daily cap; throws when it is used up. */
async function countTurn(db, today) {
  const { FieldValue } = await import('firebase-admin/firestore');
  const ref = db.collection(META).doc(`turns-${today}`);
  await db.runTransaction(async (tx) => {
    const n = (await tx.get(ref)).get('n') || 0;
    if (n >= DAILY_TURNS) throw new ApiError(429, 'daily_limit', 'Today\'s AI limit is used up.');
    tx.set(ref, { n: FieldValue.increment(1), day: today }, { merge: true });
  });
}

/** POST: queue one assistant turn. Returns { job }. */
export async function enqueueTurn(body) {
  const messages = cleanMessages(body?.messages);
  const today = todayOf(body?.today);
  const db = await adminDb();
  if (!(await pollerAlive(db))) throw new ApiError(503, 'ai_offline', 'The AI computer is not connected.');
  await countTurn(db, today);
  const { Timestamp } = await import('firebase-admin/firestore');
  const id = randomBytes(16).toString('hex');
  await db.collection(JOBS).doc(id).set({
    status: 'pending',
    created: Timestamp.now(),
    today,
    messagesGz: gzipSync(Buffer.from(JSON.stringify(messages), 'utf8')),
  });
  return { job: id, provider: 'claude-vps' };
}

/** GET ?job=: the job's state. { status: pending|working|done|error, content?, stop_reason?, error?, message? } */
export async function jobStatus(id) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) throw new ApiError(400, 'bad_job', 'Unknown job.');
  const db = await adminDb();
  const snap = await db.collection(JOBS).doc(id).get();
  if (!snap.exists) throw new ApiError(404, 'bad_job', 'Unknown job.');
  const d = snap.data();
  if (d.status === 'done') {
    const r = JSON.parse(d.resultJson || '{}');
    return { status: 'done', content: r.content || [], stop_reason: r.stop_reason || 'end_turn' };
  }
  if (d.status === 'error') return { status: 'error', error: d.errorCode || 'ai_failed', message: d.errorMessage || '' };
  return { status: d.status === 'processing' ? 'working' : 'pending' };
}

/** /api/qa-chat when AI_PROVIDER=claude-vps: POST queues a turn, GET ?job= reads it. */
export async function handleVpsRequest(request) {
  const { json, readJson } = await import('./http.js');
  const { errorBody } = await import('./gemini.js');
  try {
    if (request.method === 'GET') {
      const job = new URL(request.url).searchParams.get('job');
      return json(200, await jobStatus(job));
    }
    const { body, error } = await readJson(request, 300000);
    if (error) return error;
    return json(200, await enqueueTurn(body));
  } catch (err) {
    return json(err instanceof ApiError ? err.status : 500, errorBody(err));
  }
}
