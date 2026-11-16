import { useEffect, useState } from 'react';
import Icon from '@/components/common/Icon';
import SecretInput from '@/components/common/SecretInput';
import WeeklyLimitCard from '@/components/settings/WeeklyLimitCard';
import TopBar from '@/components/common/TopBar';
import { useLang } from '@/context/LanguageContext';
import { postJson } from '@/services/serverApi';

const PIN_RE = /^\d{4,8}$/;
const digits = (v) => v.replace(/\D/g, '').slice(0, 8);

/** Hindi message for a settings error (translated in the UI). */
function errorText(err, t) {
  const d = err?.data || {};
  switch (err?.code) {
    case 'wrong_pin':
      return `${t('PIN गलत है।')} ${t(`${d.triesLeft} कोशिश बाकी`)}`;
    case 'locked':
      return t(`बहुत बार गलत PIN। ${d.minutes || 15} मिनट बाद फिर कोशिश करें।`);
    case 'invalid_key':
      return t('यह key काम नहीं कर रही। Google AI Studio से सही key कॉपी करें।');
    case 'check_failed':
      return t('Key जाँची नहीं जा सकी (Google से जवाब नहीं आया)। थोड़ी देर बाद फिर कोशिश करें।');
    case 'bad_key_format':
      return t('यह Gemini API key जैसी नहीं लगती। पूरी key कॉपी करके पेस्ट करें।');
    case 'pin_required':
    case 'bad_pin_format':
      return t('PIN 4 से 8 अंकों का होना चाहिए।');
    case 'bad_limit':
      return t('सीमा $0.5 से $1000 के बीच लिखें।');
    case 'store_unavailable':
      return t('सेटिंग्स अभी उपलब्ध नहीं हैं। थोड़ी देर बाद कोशिश करें।');
    case 'offline':
      return t('इंटरनेट नहीं है। फिर से कोशिश करें।');
    default:
      return t('कुछ गड़बड़ हुई। फिर से कोशिश करें।');
  }
}

/** Teacher only: change the Gemini API key the AI features use (e.g. to switch account). */
export default function SettingsPage() {
  const { t } = useLang();
  const [st, setSt] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [key, setKey] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [changePin, setChangePin] = useState(false);
  const [busy, setBusy] = useState(false);
  // ok: Hindi text key; err: the error (or a Hindi text key) – both translated when rendered
  const [msg, setMsg] = useState({ ok: '', err: null });

  const loadStatus = async () => {
    try {
      setSt(await postJson('/api/settings', { action: 'status' }));
      setLoadErr(null);
    } catch (err) {
      setLoadErr(err);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstTime = st && !st.pinSet;
  const wantsNewPin = firstTime || changePin;

  const run = async (payload, okText) => {
    setBusy(true);
    setMsg({ ok: '', err: null });
    try {
      setSt(await postJson('/api/settings', payload));
      setKey('');
      setPin('');
      setNewPin('');
      setNewPin2('');
      setChangePin(false);
      setMsg({ ok: okText, err: null });
    } catch (err) {
      setMsg({ ok: '', err });
    } finally {
      setBusy(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    if (!key.trim()) return setMsg({ ok: '', err: 'नई Gemini API key लिखें।' });
    if (!firstTime && !PIN_RE.test(pin)) return setMsg({ ok: '', err: 'अपना सेटिंग्स PIN लिखें।' });
    if (wantsNewPin) {
      if (!PIN_RE.test(newPin)) return setMsg({ ok: '', err: 'PIN 4 से 8 अंकों का होना चाहिए।' });
      if (newPin !== newPin2) return setMsg({ ok: '', err: 'दोनों PIN एक जैसे नहीं हैं।' });
    }
    run(
      { action: 'set_key', key: key.trim(), pin, ...(wantsNewPin ? { newPin } : {}) },
      'Key सहेज दी गई और जाँच ली गई। AI अब इसी key से चलेगा।',
    );
  };

  const remove = () => {
    if (!PIN_RE.test(pin)) return setMsg({ ok: '', err: 'Key हटाने के लिए अपना सेटिंग्स PIN लिखें।' });
    run({ action: 'remove_key', pin }, 'ऐप में सहेजी key हटा दी गई।');
  };

  return (
    <>
      <TopBar title="सेटिंग्स" />
      <div className="pad stack settings">
        <section className="set-card">
          <h3>
            <Icon name="star" size={18} /> {t('Gemini API key')}
          </h3>
          {loadErr && <p className="err">{errorText(loadErr, t)}</p>}
          {!st && !loadErr && <p className="muted small">{t('लोड हो रहा है…')}</p>}
          {st && (
            <div className={`set-status ${st.configured ? 'ok' : 'bad'}`}>
              <Icon name={st.configured ? 'check' : 'close'} size={18} />
              <div>
                <b>{t(st.configured ? 'Key सेट है' : 'Key सेट नहीं है')}</b>
                {st.configured && (
                  <span>
                    •••• {st.last4} · {t(st.source === 'app' ? 'इस ऐप में सहेजी गई' : 'Netlify सेटिंग से')}
                  </span>
                )}
                {!st.configured && <span>{t('AI चैट और अनुवाद के लिए key ज़रूरी है।')}</span>}
              </div>
            </div>
          )}
        </section>

        {st && (
          <form className="set-card stack" onSubmit={save} autoComplete="off">
            <h3>{t(st.configured ? 'Key बदलें' : 'Key जोड़ें')}</h3>
            <label className="qf">
              <span>{t('नई Gemini API key')}</span>
              <SecretInput value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza…" />
            </label>

            {!firstTime && (
              <label className="qf">
                <span>{t('सेटिंग्स PIN')}</span>
                <SecretInput inputMode="numeric" value={pin} onChange={(e) => setPin(digits(e.target.value))} />
              </label>
            )}

            {!firstTime && (
              <label className="set-check">
                <input type="checkbox" checked={changePin} onChange={(e) => setChangePin(e.target.checked)} />
                {t('PIN भी बदलें')}
              </label>
            )}

            {wantsNewPin && (
              <div className="qf-row two">
                <label className="qf">
                  <span>{t(firstTime ? 'नया PIN बनाएँ' : 'नया PIN')}</span>
                  <SecretInput inputMode="numeric" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} />
                </label>
                <label className="qf">
                  <span>{t('PIN दोबारा')}</span>
                  <SecretInput inputMode="numeric" value={newPin2} onChange={(e) => setNewPin2(digits(e.target.value))} />
                </label>
              </div>
            )}
            {firstTime && <p className="note">{t('यह PIN याद रखें। आगे key बदलने के लिए यही PIN पूछा जाएगा।')}</p>}

            {msg.err && <p className="err">{typeof msg.err === 'string' ? t(msg.err) : errorText(msg.err, t)}</p>}
            {msg.ok && <p className="set-ok">{t(msg.ok)}</p>}

            <button type="submit" className="btn" disabled={busy}>
              {t(busy ? 'जाँच रहे हैं…' : 'Key सहेजें')}
            </button>
            {st.source === 'app' && (
              <button type="button" className="link" onClick={remove} disabled={busy}>
                {t('ऐप में सहेजी key हटाएँ')}
              </button>
            )}
          </form>
        )}

        {st && <WeeklyLimitCard status={st} />}

        <section className="set-card set-help">
          <h3>{t('Key कैसे बनाएँ')}</h3>
          <ol>
            <li>{t('aistudio.google.com/apikey खोलें और अपने Google खाते से लॉगिन करें।')}</li>
            <li>{t('"Create API key" दबाएँ और key कॉपी करें।')}</li>
            <li>{t('यहाँ key पेस्ट करके सहेजें। ऐप key को जाँचकर सर्वर पर सुरक्षित रखता है; फ़ोन पर सिर्फ़ अंतिम 4 अक्षर दिखते हैं।')}</li>
            <li>{t('मुफ़्त (free) योजना में सीमित अनुरोध मिलते हैं, और Google इस डेटा से अपने मॉडल सुधार सकता है। बिलिंग चालू करें तो खर्च सीमा ज़रूर लगाएँ।')}</li>
          </ol>
        </section>
      </div>
    </>
  );
}
