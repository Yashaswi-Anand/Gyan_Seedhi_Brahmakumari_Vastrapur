/* POST /api/qa-chat – the teacher's AI chat with Gemini (one assistant turn per request).
   Uses the key saved in the app's Settings tab, else GEMINI_API_KEY from Netlify. */
import { getAiKey } from '../../server/secrets.js';
import { handleQaChatRequest } from '../../server/qaChat.js';

export default async (request) =>
  handleQaChatRequest(request, { apiKey: await getAiKey({ envKey: process.env.GEMINI_API_KEY }) });

export const config = { path: '/api/qa-chat' };
