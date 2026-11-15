/* Asks our /api/translate endpoint (Claude on the server) to translate one question. */
import { postJson } from './serverApi';

/**
 * @param fields { q, opts, hint, exp, title } in any one language
 * @returns { hi, en, gu } – each { q, opts, hint, exp, title }
 */
export const translateWithClaude = (fields) => postJson('/api/translate', fields);
