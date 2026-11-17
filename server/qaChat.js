/* Q/A chat: the teacher writes an instruction, Gemini manages questions with tools.
   Server-side only. The browser runs the tool loop: read-only tools run straight away,
   and every change (add / update / delete) is shown to the teacher as a card to apply or cancel.
   The browser keeps the chat in a simple block format (text / tool_use / tool_result); this file
   turns it into Gemini's contents and back. Each Gemini answer's original parts are kept in a
   hidden `gemini` block and sent back unchanged, because they carry the model's thought signatures. */
import { ApiError, errorBody, generateContent, modelName, partsOf, stopReason, usageOf } from './gemini.js';
import { readJson, streamJsonResult } from './http.js';
import { SYSTEM, TOOLS } from './qaPrompt.js';
import { handleVpsRequest, vpsEnabled } from './vpsQueue.js';
import { assertWithinBudget, budgetStatus, recordUsage } from './usage.js';

const MAX_MESSAGES = 80;
const MAX_BODY_CHARS = 300000;
const BLOCK_TYPES = new Set(['text', 'tool_use', 'tool_result', 'gemini']);

/** Gemini function declarations (full JSON Schema in parametersJsonSchema). */
const FUNCTIONS = TOOLS.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.input_schema }));

/** Only well-formed chat turns go to Gemini (the system prompt and tools are fixed here). */
export function cleanMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) {
    throw new ApiError(400, 'bad_messages', 'Invalid chat history.');
  }
  return messages.map((m) => {
    if (!m || !['user', 'assistant'].includes(m.role)) throw new ApiError(400, 'bad_messages', 'Invalid chat history.');
    if (typeof m.content === 'string') return { role: m.role, content: m.content };
    if (!Array.isArray(m.content) || m.content.some((b) => !b || !BLOCK_TYPES.has(b.type))) {
      throw new ApiError(400, 'bad_messages', 'Invalid chat history.');
    }
    return { role: m.role, content: m.content };
  });
}

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text || '').join('\n') : String(c ?? ''));

/** Chat blocks → Gemini contents. */
export function toContents(messages) {
  const calls = {}; // tool_use id → { name, gid }
  return messages.map((m) => {
    if (m.role === 'assistant') {
      const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
      for (const b of blocks) if (b.type === 'tool_use') calls[b.id] = { name: b.name, gid: b.gid || null };
      const raw = blocks.find((b) => b.type === 'gemini' && Array.isArray(b.parts));
      if (raw?.parts.length) return { role: 'model', parts: raw.parts };
      const parts = blocks.flatMap((b) =>
        b.type === 'text' && b.text
          ? [{ text: b.text }]
          : b.type === 'tool_use'
            ? [{ functionCall: { name: b.name, args: b.input || {}, ...(b.gid ? { id: b.gid } : {}) } }]
            : [],
      );
      return { role: 'model', parts: parts.length ? parts : [{ text: ' ' }] };
    }
    if (typeof m.content === 'string') return { role: 'user', parts: [{ text: m.content }] };
    const parts = m.content.flatMap((b) => {
      if (b.type === 'text') return b.text ? [{ text: b.text }] : [];
      if (b.type !== 'tool_result') return [];
      const call = calls[b.tool_use_id];
      if (!call) throw new ApiError(400, 'bad_messages', 'Invalid chat history.');
      const out = textOf(b.content);
      return [
        {
          functionResponse: {
            name: call.name,
            response: b.is_error ? { error: out } : { output: out },
            ...(call.gid ? { id: call.gid } : {}),
          },
        },
      ];
    });
    return { role: 'user', parts: parts.length ? parts : [{ text: ' ' }] };
  });
}

/** Gemini parts → chat blocks (text + tool_use) plus the hidden original parts. */
export function toBlocks(parts) {
  const blocks = [];
  let text = '';
  parts.forEach((p, i) => {
    if (p.thought) return; // thought summaries are not shown
    if (typeof p.text === 'string') text += p.text;
    if (p.functionCall) {
      if (text.trim()) blocks.push({ type: 'text', text });
      text = '';
      const gid = p.functionCall.id || null;
      blocks.push({
        type: 'tool_use',
        id: gid || `call_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        gid,
        name: p.functionCall.name,
        input: p.functionCall.args || {},
      });
    }
  });
  if (text.trim()) blocks.push({ type: 'text', text });
  blocks.push({ type: 'gemini', parts });
  return blocks;
}

/** One assistant turn. Returns { content, stop_reason }; the browser runs any tool calls. */
export async function qaChatTurn(body, { apiKey, dev = false } = {}) {
  const messages = cleanMessages(body?.messages);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  if (!apiKey) throw new ApiError(500, 'no_key', 'The Gemini service is not set up.');
  await assertWithinBudget({ dev }); // the teacher's weekly limit
  const model = modelName();
  const data = await generateContent(
    apiKey,
    {
      systemInstruction: { parts: [{ text: `${SYSTEM}\n\nToday's date (India): ${today}.` }] },
      contents: toContents(messages),
      tools: [{ functionDeclarations: FUNCTIONS }],
      generationConfig: {
        maxOutputTokens: 24000,
        // low thinking keeps each step quick enough for the hosting time limit
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    },
    { model },
  );
  await recordUsage(data.modelUsed || model, usageOf(data), { dev });
  let budget = null;
  try {
    budget = await budgetStatus({ dev }); // lets the chat warn near the weekly limit
  } catch {
    /* usage storage unavailable: just skip the warning */
  }
  const parts = partsOf(data);
  return { content: toBlocks(parts), stop_reason: stopReason(data, parts), budget };
}

/** POST /api/qa-chat */
export async function handleQaChatRequest(request, { apiKey, dev = false } = {}) {
  // AI_PROVIDER=claude-vps: the turn is queued for Claude on the VPS (server/vpsQueue.js)
  if (vpsEnabled()) return handleVpsRequest(request);
  const { body, error } = await readJson(request, MAX_BODY_CHARS);
  if (error) return error;
  return streamJsonResult(() => qaChatTurn(body, { apiKey, dev }), errorBody);
}
