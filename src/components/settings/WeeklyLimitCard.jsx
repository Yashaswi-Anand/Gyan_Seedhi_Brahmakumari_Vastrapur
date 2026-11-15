import { useState } from 'react';
import Icon from '@/components/common/Icon';
import SecretInput from '@/components/common/SecretInput';
import { useLang } from '@/context/LanguageContext';
import { postJson } from '@/services/serverApi';

const PIN_RE = /^\d{4,8}$/;
const digits = (v) => v.replace(/\D/g, '').slice(0, 8);
const usd = (n) => `$${(n || 0).toFixed(n >= 10 ? 0 : 2)}`;

/**
 * The teacher's weekly AI limit (USD), set with the settings PIN.
 * Usage is still tracked on the server: the AI tab warns at 80% and the AI stops at 100%.
 */
export default function WeeklyLimitCard({ status, onSaved, errorText }) {
  const { t } = useLang();
  const b = status.budget;
  const [limit, setLimit] = useState(b?.limitUsd ? String(b.limitUsd) : '');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: '', err: null });

  const save = async (value) => {
    if (status.pinSet ? !PIN_RE.test(pin) : !PIN_RE.test(newPin)) {
      setMsg({ ok: '', err: status.pinSet ? 'अपना सेटिंग्स PIN लिखें।' : 'PIN 4 से 8 अंकों का होना चाहिए।' });
      return;
    }
    setBusy(true);
    setMsg({ ok: '', err: null });
    try {
      const next = await postJson('/api/settings', {
        action: 'set_limit',
        limitUsd: value,
        ...(status.pinSet ? { pin } : { newPin }),
      });
      onSaved(next);
      setPin('');
      setNewPin('');
      setLimit(next.budget?.limitUsd ? String(next.budget.limitUsd) : '');
      setMsg({ ok: value ? 'साप्ताहिक सीमा सहेज दी गई।' : 'साप्ताहिक सीमा हटा दी गई।', err: null });
    } catch (err) {
      setMsg({ ok: '', err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="set-card stack">
      <h3>
        <Icon name="trophy" size={18} /> {t('साप्ताहिक AI सीमा')}
      </h3>
      <div className="use-box">
        <div className="use-nums">
          <b>{b?.limitUsd ? usd(b.limitUsd) : '—'}</b>
          <span>{t(b?.limitUsd ? 'प्रति सप्ताह' : '(कोई सीमा नहीं)')}</span>
        </div>
      </div>

      <form
        className="stack"
        style={{ gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          save(limit);
        }}
      >
        <label className="qf">
          <span>{t('साप्ताहिक सीमा (USD $)')}</span>
          <input
            type="text"
            inputMode="decimal"
            value={limit}
            placeholder={t('जैसे: 5')}
            onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, '').slice(0, 7))}
          />
        </label>
        <label className="qf">
          <span>{t(status.pinSet ? 'सेटिंग्स PIN' : 'नया PIN बनाएँ')}</span>
          {status.pinSet ? (
            <SecretInput inputMode="numeric" value={pin} onChange={(e) => setPin(digits(e.target.value))} />
          ) : (
            <SecretInput inputMode="numeric" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} />
          )}
        </label>
        {msg.err && <p className="err">{typeof msg.err === 'string' ? t(msg.err) : errorText(msg.err, t)}</p>}
        {msg.ok && <p className="set-ok">{t(msg.ok)}</p>}
        <button type="submit" className="btn" disabled={busy || !limit}>
          {t('सीमा सहेजें')}
        </button>
        {b?.limitUsd && (
          <button type="button" className="link" onClick={() => save(null)} disabled={busy}>
            {t('सीमा हटाएँ')}
          </button>
        )}
      </form>
    </section>
  );
}
