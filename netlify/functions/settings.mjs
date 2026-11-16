/* POST /api/settings – Gemini API key status / change (PIN protected). */
import { handleSettingsRequest } from '../../server/settings.js';

export default (request) => handleSettingsRequest(request, { envKey: process.env.GEMINI_API_KEY });

export const config = { path: '/api/settings' };
