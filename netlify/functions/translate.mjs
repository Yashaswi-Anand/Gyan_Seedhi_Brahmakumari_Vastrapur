/* POST /api/translate – translates a quiz question with Gemini.
   Uses the key saved in the app's Settings tab, else GEMINI_API_KEY from Netlify. */
import { getAiKey } from '../../server/secrets.js';
import { handleTranslateRequest } from '../../server/translate.js';

export default async (request) =>
  handleTranslateRequest(request, { apiKey: await getAiKey({ envKey: process.env.GEMINI_API_KEY }) });

export const config = { path: '/api/translate' };
