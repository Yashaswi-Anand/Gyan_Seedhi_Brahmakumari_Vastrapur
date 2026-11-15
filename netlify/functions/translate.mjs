/* POST /api/translate – translates a quiz question with Claude.
   Set ANTHROPIC_API_KEY in Netlify: Site configuration → Environment variables. */
import { handleTranslateRequest } from '../../server/translate.js';

export default (request) => handleTranslateRequest(request, { apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { path: '/api/translate' };
