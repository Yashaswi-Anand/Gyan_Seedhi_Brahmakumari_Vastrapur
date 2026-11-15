/* POST /api/qa-chat – the teacher's Q/A chat with Claude (one assistant turn per request).
   Needs ANTHROPIC_API_KEY in Netlify: Site configuration → Environment variables. */
import { handleQaChatRequest } from '../../server/qaChat.js';

export default (request) => handleQaChatRequest(request, { apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { path: '/api/qa-chat' };
