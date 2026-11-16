import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LanguageSwitch from '@/components/common/LanguageSwitch';
import Logo from '@/components/common/Logo';
import { CENTRE_NAME, isTeacherMobile } from '@/constants/config';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { fetchStudentResults } from '@/services/resultsRepo';

const MOBILE_RE = /^[6-9]\d{9}$/;

/** Two steps: mobile number, then (only for a number never used before) the person's name. */
export default function LoginPage() {
  const { db, login, register, restore, openDemo } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const goHome = () => navigate('/', { replace: true });

  const next = async () => {
    if (busy) return;
    const v = mobile.replace(/\D/g, '');
    if (!MOBILE_RE.test(v)) {
      setError('कृपया 10 अंकों का सही मोबाइल नंबर लिखें।');
      return;
    }
    setError('');
    if (db[v]) {
      login(v);
      goHome();
      return;
    }
    // number already used on another phone: open the same account with its saved results
    if (!isTeacherMobile(v)) {
      setBusy(true);
      try {
        const results = await fetchStudentResults(v);
        if (results.length) {
          restore(v, results);
          goHome();
          return;
        }
      } catch {
        // offline: continue as new; saved days are added once the phone is back online
      } finally {
        setBusy(false);
      }
    }
    setStep(2);
  };

  const done = () => {
    const nm = name.trim();
    if (nm.length < 2) {
      setError('कृपया अपना नाम लिखें।');
      return;
    }
    register(mobile, nm, '');
    goHome();
  };

  const onEnter = (fn) => (e) => {
    if (e.key === 'Enter') fn();
  };

  return (
    <section className="login">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </div>
      <div className="mark">
        <Logo size={72} />
      </div>
      <h1>{t('ज्ञान सीढ़ी')}</h1>
      <p className="muted">{t('मुरली के बिंदु, खेल-खेल में समझें।')}</p>

      {step === 1 ? (
        <div className="stack">
          <label htmlFor="mob">{t('अपना मोबाइल नंबर लिखें')}</label>
          <input
            id="mob"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            placeholder={t('10 अंकों का नंबर')}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={onEnter(next)}
            autoFocus
          />
          <p className="err">{t(error)}</p>
          <button className="btn" onClick={next} disabled={busy}>
            {t(busy ? 'जाँच हो रही है…' : 'आगे बढ़ें')}
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="chip" style={{ alignSelf: 'flex-start' }}>
            {t('नंबर ') + mobile}
          </p>
          <label htmlFor="nm">{t('आपका नाम')}</label>
          <input
            id="nm"
            type="text"
            maxLength={30}
            autoComplete="name"
            placeholder={t('जैसे: सुनीता बहन')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onEnter(done)}
            autoFocus
          />
          <p className="err">{t(error)}</p>
          <button className="btn" onClick={done}>
            {t('शुरू करें')}
          </button>
          <button
            className="link"
            onClick={() => {
              setStep(1);
              setError('');
            }}
          >
            {t('नंबर बदलें')}
          </button>
        </div>
      )}

      <button
        className="link"
        onClick={() => {
          openDemo();
          goHome();
        }}
      >
        {t('नमूना खाता देखें')}
      </button>
      <p className="bkfoot">{CENTRE_NAME}</p>
    </section>
  );
}
