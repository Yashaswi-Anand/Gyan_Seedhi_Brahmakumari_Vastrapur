/* One assistant turn of the AI chat, answered by Claude Code CLI (`claude -p`) on the VPS.
   Pure functions, no I/O: the poller (poller/poller.mjs) runs `claude`, this file only builds
   what goes in and reads what comes out.

   The chat keeps its own block format (text / tool_use / tool_result). `claude -p` has no way to
   accept the app's tools as real tools, so the conversation is written out as a transcript and
   Claude answers through a JSON schema: { text, tool_calls: [{ name, input }] }. The schema lists
   each tool with its exact input schema, so a tool call always has the right shape. The browser
   then runs the tool calls exactly as it did with Gemini. */
import { SYSTEM, TOOLS } from './qaPrompt.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CLAUDE_RULES = `
How you answer in this app (important):
- You can't call the tools yourself. To use one, put it in "tool_calls" with its exact input; the app runs it and
  the result appears in the conversation as a "Tool result" in the next turn. You may put several tool calls in one
  turn; they run in that order.
- "text" is what the teacher reads now. Keep it short when you are calling tools (one line, or "").
- When you are not calling any tool, "tool_calls" is [] and "text" is your reply to the teacher.
- Never write a tool result yourself and never pretend a tool ran: wait for its result in the next turn.
- Write the questions only inside tool calls, never as a list in "text".`;

/** System prompt for one turn: the app's instructions + today's date + how to answer here. */
export function systemPrompt(today) {
  return `${SYSTEM}\n\nToday's date (India): ${today}.\n${CLAUDE_RULES}`;
}

/** JSON schema of the answer: text + tool calls, each tool with its own exact input schema. */
export function answerSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'tool_calls'],
    properties: {
      text: { type: 'string', description: 'What the teacher reads now' },
      tool_calls: {
        type: 'array',
        description: 'Tools for the app to run, in order; [] when none',
        items: {
          anyOf: TOOLS.map((t) => ({
            type: 'object',
            additionalProperties: false,
            required: ['name', 'input'],
            properties: {
              name: { type: 'string', const: t.name, description: t.description },
              input: t.input_schema,
            },
          })),
        },
      },
    },
  };
}

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text || '').join('\n') : String(c ?? ''));

/** The chat so far as a plain transcript (the app's hidden Gemini blocks are skipped). */
export function transcript(messages) {
  const names = {}; // tool_use id → tool name
  const out = [];
  for (const m of messages) {
    if (m.role === 'assistant') {
      const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content || [];
      const lines = [];
      for (const b of blocks) {
        if (b.type === 'text' && b.text?.trim()) lines.push(b.text.trim());
        if (b.type === 'tool_use') {
          names[b.id] = b.name;
          lines.push(`[tool call ${b.name}] ${JSON.stringify(b.input || {})}`);
        }
      }
      out.push(`### Assistant\n${lines.join('\n') || '(no text)'}`);
      continue;
    }
    if (typeof m.content === 'string') {
      out.push(`### Teacher\n${m.content}`);
      continue;
    }
    for (const b of m.content || []) {
      if (b.type === 'text' && b.text?.trim()) out.push(`### Teacher\n${b.text.trim()}`);
      if (b.type === 'tool_result') {
        const name = names[b.tool_use_id] || 'tool';
        out.push(`### Tool result (${name})${b.is_error ? ' - ERROR' : ''}\n${textOf(b.content)}`);
      }
    }
  }
  return out.join('\n\n');
}

/** The prompt sent on stdin for one turn. */
export function turnPrompt(messages) {
  return `Below is the conversation in the app so far. Write the assistant's NEXT turn as the JSON answer.\n\n${transcript(messages)}\n\n### Your next turn (as the Assistant)`;
}

/** Today's date as given by the browser, else India's date now. */
export function todayOf(v) {
  if (DATE_RE.test(v || '')) return v;
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Claude's structured answer → the chat's blocks.
 * Returns { content, stop_reason } or throws when the answer is unusable.
 */
export function blocksFromAnswer(answer, idPrefix = Date.now().toString(36)) {
  if (!answer || typeof answer !== 'object') throw new Error('no structured answer');
  const known = new Set(TOOLS.map((t) => t.name));
  const calls = Array.isArray(answer.tool_calls) ? answer.tool_calls : [];
  const content = [];
  const text = typeof answer.text === 'string' ? answer.text.trim() : '';
  if (text) content.push({ type: 'text', text });
  calls.forEach((c, i) => {
    if (!c || !known.has(c.name) || !c.input || typeof c.input !== 'object') throw new Error(`bad tool call ${c?.name}`);
    content.push({ type: 'tool_use', id: `cl_${idPrefix}_${i}`, name: c.name, input: c.input });
  });
  if (!content.length) throw new Error('empty answer');
  return { content, stop_reason: calls.length ? 'tool_use' : 'end_turn' };
}
