/* Small HTTP helpers shared by the server endpoints (Netlify Functions + the Vite dev server). */

export const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/** Reads a JSON body with a size cap. Returns { body } or { error: Response }. */
export async function readJson(request, maxChars) {
  if (request.method !== 'POST') return { error: json(405, { error: 'method_not_allowed' }) };
  const raw = await request.text();
  if (raw.length > maxChars) return { error: json(413, { error: 'too_large', message: 'The message is too long.' }) };
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: json(400, { error: 'bad_json' }) };
  }
}

/**
 * Runs slow work (a Claude call) and streams the JSON result.
 * A space is sent every few seconds so the connection stays open: Netlify allows a streamed
 * response to run much longer than a normal one, and JSON.parse ignores the leading spaces.
 * Errors are sent as { error, message } in the body (the status is already 200 by then).
 */
export function streamJsonResult(work, toErrorBody) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(' '));
      const timer = setInterval(() => controller.enqueue(enc.encode(' ')), 4000);
      let out;
      try {
        out = await work();
      } catch (err) {
        out = toErrorBody(err);
      } finally {
        clearInterval(timer);
      }
      controller.enqueue(enc.encode(JSON.stringify(out)));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
  });
}
