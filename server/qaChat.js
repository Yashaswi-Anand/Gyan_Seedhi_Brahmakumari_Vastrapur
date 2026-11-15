/* Q/A chat: the teacher writes an instruction, Claude manages questions with tools.
   Server-side only. The browser runs the tool loop: read-only tools run straight away,
   and every change (add / update / delete) is shown to the teacher as a card to apply or cancel. */
import { ApiError, BK_LANGUAGE_RULES, FALLBACK, MODEL, errorBody, makeClient, mapClaudeError } from './claude.js';
import { readJson, streamJsonResult } from './http.js';

const MAX_MESSAGES = 80;
const MAX_BODY_CHARS = 300000;
const BLOCK_TYPES = new Set(['text', 'tool_use', 'tool_result', 'thinking', 'redacted_thinking', 'fallback']);

const SYSTEM = `You are the question assistant inside "Gyan Seedhi", the daily Murli quiz app of Brahma Kumaris Vastrapur. The person chatting with you is the centre's teacher. You help them create and manage quiz questions so they don't have to type them one by one.

How the quiz works:
- Questions belong to a date (YYYY-MM-DD). A student's quiz for a day uses the questions of that date; if a date has none, the latest earlier date is used.
- A day normally has 5 "murli" questions followed by 5 "chart" questions, each worth 20 marks.
- "murli": multiple choice, 2 to 4 options, exactly one correct option ("ans" = index from 0). Optional "hint" (shown when a student asks for help) and optional "exp" (the point from the murli, shown after answering). "tag" is one of: "सही उत्तर चुनें" (choose the right answer), "खाली जगह भरें" (fill in the blank), "सही या गलत" (true or false: options "हाँ, सही है" / "नहीं, गलत है").
- "chart": a self-check question about the student's own spiritual practice that day (for example Amrit Vela yoga 4:30–4:45, traffic control, one minute of silence every hour, pure feelings for everyone). The student gives themselves 0–20 marks, so there are no options and no correct answer. Optional short "title" shown as a label.

Every question must be written in all three languages, in "i18n":
${BK_LANGUAGE_RULES}
Hindi is the main language. Options must be in the same order in every language.

Creating questions from a murli:
- Base murli questions strictly on the murli text the teacher gives. Quote or closely follow its wording; do not invent teachings.
- If the teacher asks for questions from a murli but gives no text, ask them to paste it. Do not make up murli content.
- Make options plausible, with only one clearly correct answer, and put the correct answer in varying positions.

Tools:
- list_questions shows questions saved for a date range. Look before you change or delete anything, and to avoid adding duplicates.
- propose_add_questions, propose_update_question and propose_delete_questions do not change anything by themselves: the teacher sees each proposal as a card and taps Apply or Cancel. The tool result tells you what happened.
- Add at most 3 questions per propose_add_questions call. For more, make several calls one after another (for 5 murli + 5 chart, use 4 calls).
- When you refer to questions, use the date and their number within that day as the teacher sees them (murli first, then chart).

Talk to the teacher in the language they write in, briefly and warmly. After the work is done, give a one- or two-line summary.`;

const versionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['q', 'opts', 'hint', 'exp', 'title'],
  properties: {
    q: { type: 'string', description: 'Question text' },
    opts: { type: 'array', items: { type: 'string' }, description: 'Options for murli questions; [] for chart' },
    hint: { type: 'string', description: 'Hint, or "" ' },
    exp: { type: 'string', description: 'Point from the murli, or ""' },
    title: { type: 'string', description: 'Short label for chart questions, or ""' },
  },
};

const questionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'category', 'tag', 'ans', 'i18n'],
  properties: {
    date: { type: 'string', description: 'YYYY-MM-DD' },
    category: { type: 'string', enum: ['murli', 'chart'] },
    tag: { type: 'string', description: 'For murli: one of the three tags. For chart: ""' },
    ans: { type: 'integer', description: 'Index of the correct option (from 0). For chart: 0' },
    i18n: {
      type: 'object',
      additionalProperties: false,
      required: ['hi', 'en', 'gu'],
      properties: { hi: versionSchema, en: versionSchema, gu: versionSchema },
    },
  },
};

export const TOOLS = [
  {
    name: 'list_questions',
    description:
      'List saved questions between two dates (inclusive), grouped by date in the order students see them. Returns id, date, number within the day, category, tag, Hindi text, options, correct answer and which languages exist.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['from_date', 'to_date'],
      properties: {
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'propose_add_questions',
    description:
      'Propose up to 3 new questions. The teacher reviews them and taps Apply or Cancel; the result says which happened.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['questions', 'note'],
      properties: {
        questions: { type: 'array', items: questionSchema, description: '1 to 3 questions' },
        note: { type: 'string', description: 'One short line for the teacher about this batch' },
      },
    },
  },
  {
    name: 'propose_update_question',
    description:
      'Propose replacing one existing question (by id) with a corrected version in all three languages. The teacher applies or cancels.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'question', 'note'],
      properties: {
        id: { type: 'string' },
        question: questionSchema,
        note: { type: 'string', description: 'What changes, in one short line' },
      },
    },
  },
  {
    name: 'propose_delete_questions',
    description: 'Propose deleting questions by id. The teacher confirms or cancels.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['ids', 'note'],
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        note: { type: 'string', description: 'Why, in one short line' },
      },
    },
  },
];

/** Only well-formed chat turns go to Claude (the system prompt and tools are fixed here). */
function cleanMessages(messages) {
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

/** One assistant turn. Returns { content, stop_reason }; the browser runs any tool calls. */
export async function qaChatTurn(body, { apiKey } = {}) {
  const messages = cleanMessages(body?.messages);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const client = makeClient(apiKey);
  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      // 'low' keeps each step quick enough for the hosting time limit; batches of 3 keep steps small
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Today's date (India): ${today}.` },
      ],
      tools: TOOLS,
      messages,
    });
  } catch (err) {
    throw mapClaudeError(err);
  }
  return { content: response.content, stop_reason: response.stop_reason };
}

/** POST /api/qa-chat */
export async function handleQaChatRequest(request, { apiKey } = {}) {
  const { body, error } = await readJson(request, MAX_BODY_CHARS);
  if (error) return error;
  return streamJsonResult(() => qaChatTurn(body, { apiKey }), errorBody);
}
