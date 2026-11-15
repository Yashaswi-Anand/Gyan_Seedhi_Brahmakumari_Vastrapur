/* POST /api/qa-chat – the teacher's AI chat with Claude (one assistant turn per request).
   Uses the key saved in the app's Settings tab, else ANTHROPIC_API_KEY from Netlify. */
import { getClaudeKey } from '../../server/secrets.js';
import { handleQaChatRequest } from '../../server/qaChat.js';

export default async (request) =>
  handleQaChatRequest(request, { apiKey: await getClaudeKey({ envKey: process.env.ANTHROPIC_API_KEY }) });

export const config = { path: '/api/qa-chat' };
