/* POST /api/translate – translates a quiz question with Claude.
   Uses the key saved in the app's Settings tab, else ANTHROPIC_API_KEY from Netlify. */
import { getClaudeKey } from '../../server/secrets.js';
import { handleTranslateRequest } from '../../server/translate.js';

export default async (request) =>
  handleTranslateRequest(request, { apiKey: await getClaudeKey({ envKey: process.env.ANTHROPIC_API_KEY }) });

export const config = { path: '/api/translate' };
