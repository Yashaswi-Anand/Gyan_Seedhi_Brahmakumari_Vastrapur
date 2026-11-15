/* POST /api/settings – Claude API key status / change (PIN protected). */
import { handleSettingsRequest } from '../../server/settings.js';

export default (request) => handleSettingsRequest(request, { envKey: process.env.ANTHROPIC_API_KEY });

export const config = { path: '/api/settings' };
