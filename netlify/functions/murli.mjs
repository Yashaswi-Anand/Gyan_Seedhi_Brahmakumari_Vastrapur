/* POST /api/murli – one day's murli text from madhubanmurli.org (used by the AI chat). */
import { handleMurliRequest } from '../../server/murli.js';

export default (request) => handleMurliRequest(request);

export const config = { path: '/api/murli' };
