import { useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { OPTION_LETTERS } from '@/i18n/calendar';
import { todayKey } from '@/utils/date';

const TAGS = ['सही उत्तर चुनें', 'खाली जगह भरें', 'सही या गलत'];
const MAX_OPTS = 4;
const LIMITS = { q: 1000, opt: 200, hint: 500, exp: 1000, title: 120 };

function emptyForm() {
  return { date: todayKey(), category: 'murli', tag: TAGS[0], q: '', opts: ['', '', ''], ans: null, hint: '', exp: '', title: '' };
}

function fromQuestion(x) {
  return {
    date: x.date,
    category: x.category,
    tag: x.tag || TAGS[0],
    q: x.q || '',
    opts: x.category === 'murli' ? [...(x.opts || [])] : ['', '', ''],
    ans: x.category === 'murli' ? x.ans : null,
    hint: x.hint || '',
    exp: x.exp || '',
    title: x.title || '',
  };
}

/** Same checks as firestore.rules, so the teacher sees the problem before saving. */
function validate(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return 'कृपया तारीख चुनें।';
  if (!f.q.trim()) return 'कृपया प्रश्न लिखें।';
  if (f.category === 'murli') {
    if (f.opts.length < 2) return 'कम से कम 2 विकल्प चाहिए।';
    if (f.opts.some((o) => !o.trim())) return 'कोई भी विकल्प खाली न छोड़ें।';
    if (f.ans == null || f.ans >= f.opts.length) return 'सही उत्तर चुनें।';
  }
  return '';
}

/**
 * Add / edit a question (full-screen sheet).
 * @param initial  existing question to edit, or null to add a new one
 * @param onSave   async (formData) => void
 */
export default function QuestionForm({ initial, onSave, onClose }) {
  const { t, lang } = useLang();
  const [f, setF] = useState(() => (initial ? fromQuestion(initial) : emptyForm()));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const letters = OPTION_LETTERS[lang];
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const setOpt = (i, value) => set({ opts: f.opts.map((o, k) => (k === i ? value : o)) });
  const addOpt = () => f.opts.length < MAX_OPTS && set({ opts: [...f.opts, ''] });
  const removeOpt = (i) => {
    if (f.opts.length <= 2) return;
    const opts = f.opts.filter((_, k) => k !== i);
    const ans = f.ans === i ? null : f.ans != null && f.ans > i ? f.ans - 1 : f.ans;
    set({ opts, ans });
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSave(f);
    } catch {
      setError('सहेजा नहीं जा सका। इंटरनेट जाँचकर फिर से कोशिश करें।');
      setBusy(false);
    }
  };

  return (
    <div className="qform-wrap" role="dialog" aria-modal="true" aria-label={t(initial ? 'प्रश्न बदलें' : 'नया प्रश्न')}>
      <form className="qform" onSubmit={submit} noValidate>
        <div className="qform-head">
          <h3>{t(initial ? 'प्रश्न बदलें' : 'नया प्रश्न')}</h3>
          <button type="button" className="iconbtn" aria-label={t('बंद करें')} onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>

        <div className="qf-row two">
          <label className="qf">
            <span>{t('तारीख')}</span>
            <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} required />
          </label>
          <div className="qf">
            <span>{t('श्रेणी')}</span>
            <div className="qf-seg" role="radiogroup">
              {[
                ['murli', 'मुरली'],
                ['chart', 'चार्ट'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={f.category === id}
                  className={f.category === id ? `on ${id}` : ''}
                  onClick={() => set({ category: id })}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {f.category === 'murli' ? (
          <label className="qf">
            <span>{t('प्रश्न का प्रकार')}</span>
            <select value={f.tag} onChange={(e) => set({ tag: e.target.value })}>
              {TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {t(tag)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="qf">
            <span>
              {t('शीर्षक')} <small>({t('वैकल्पिक')})</small>
            </span>
            <input
              type="text"
              value={f.title}
              maxLength={LIMITS.title}
              placeholder={t('जैसे: अमृतवेला योग')}
              onChange={(e) => set({ title: e.target.value })}
            />
          </label>
        )}

        <label className="qf">
          <span>{t('प्रश्न')}</span>
          <textarea rows={3} value={f.q} maxLength={LIMITS.q} onChange={(e) => set({ q: e.target.value })} />
        </label>

        {f.category === 'murli' ? (
          <>
            <div className="qf">
              <span>{t('विकल्प')} · <small>{t('सही उत्तर पर टिक करें')}</small></span>
              <div className="qf-opts">
                {f.opts.map((o, i) => (
                  <div key={i} className={`qf-opt${f.ans === i ? ' right' : ''}`}>
                    <button
                      type="button"
                      className="qf-tick"
                      role="radio"
                      aria-checked={f.ans === i}
                      aria-label={t('सही उत्तर')}
                      onClick={() => set({ ans: i })}
                    >
                      {f.ans === i ? <Icon name="check" size={18} /> : letters[i]}
                    </button>
                    <input
                      type="text"
                      value={o}
                      maxLength={LIMITS.opt}
                      placeholder={`${t('विकल्प')} ${letters[i]}`}
                      onChange={(e) => setOpt(i, e.target.value)}
                    />
                    {f.opts.length > 2 && (
                      <button type="button" className="qf-x" aria-label={t('विकल्प हटाएँ')} onClick={() => removeOpt(i)}>
                        <Icon name="close" size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {f.opts.length < MAX_OPTS && (
                <button type="button" className="link qf-add" onClick={addOpt}>
                  + {t('विकल्प जोड़ें')}
                </button>
              )}
            </div>

            <label className="qf">
              <span>
                {t('संकेत')} <small>({t('वैकल्पिक')})</small>
              </span>
              <input type="text" value={f.hint} maxLength={LIMITS.hint} onChange={(e) => set({ hint: e.target.value })} />
            </label>
            <label className="qf">
              <span>
                {t('मुरली का बिंदु')} <small>({t('वैकल्पिक')})</small>
              </span>
              <textarea rows={2} value={f.exp} maxLength={LIMITS.exp} onChange={(e) => set({ exp: e.target.value })} />
            </label>
          </>
        ) : (
          <p className="note">{t('चार्ट प्रश्न में विद्यार्थी स्वयं 0 से 20 अंक लिखते हैं, इसलिए सही उत्तर नहीं होता।')}</p>
        )}

        {error && <p className="err">{t(error)}</p>}

        <div className="qform-actions">
          <button type="button" className="btn line" onClick={onClose} disabled={busy}>
            {t('रद्द करें')}
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {t(busy ? 'सहेजा जा रहा है…' : 'सहेजें')}
          </button>
        </div>
      </form>
    </div>
  );
}
