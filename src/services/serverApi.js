/* Calls our own server endpoints (/api/*), which talk to Gemini. The API key stays on
   the server. Long calls stream a JSON body; errors come back as { error, message }. */

export async function postJson(path, payload) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const err = new Error('offline');
    err.code = 'offline';
    throw err;
  }
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* empty or cut-off body */
  }
  if (!res.ok || data.error || !text.trim()) {
    const err = new Error(data.message || 'request_failed');
    err.code = data.error || (text.trim() ? `http_${res.status}` : 'cut_off');
    err.data = data; // extra details, e.g. triesLeft for a wrong PIN
    throw err;
  }
  return data;
}

/** Friendly Hindi message for a server error code (translated in the UI). */
export function serverErrorMessage(err) {
  switch (err?.code) {
    case 'no_key':
      return 'AI सेवा अभी सेट नहीं है (Gemini API key नहीं मिली)।';
    case 'offline':
      return 'इंटरनेट नहीं है। फिर से कोशिश करें।';
    case 'weekly_limit':
      return 'इस सप्ताह की AI सीमा पूरी हो गई। सेटिंग्स में सीमा बढ़ाएँ या अगले सोमवार तक रुकें।';
    case 'busy':
      return 'अभी बहुत अनुरोध हैं। एक मिनट बाद फिर कोशिश करें।';
    case 'too_large':
      return 'संदेश बहुत लंबा है। थोड़ा छोटा करके भेजें।';
    case 'cut_off':
      return 'जवाब पूरा नहीं आया (समय सीमा)। छोटे काम में बाँटकर फिर कोशिश करें।';
    default:
      return 'कुछ गड़बड़ हुई। फिर से कोशिश करें।';
  }
}

const FRIENDLY = new Set(['no_key', 'offline', 'weekly_limit', 'too_large', 'cut_off']);

/** The technical reason behind the general "something went wrong" message, shown small so the cause is visible. */
export function serverErrorDetail(err) {
  if (!err || FRIENDLY.has(err.code)) return '';
  const msg = err.message && err.message !== 'request_failed' ? err.message : '';
  return [err.code, msg].filter(Boolean).join(': ');
}
