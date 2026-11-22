import { useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { OPTION_LETTERS } from '@/i18n/calendar';
import { translateName } from '@/i18n/translate';
import { translateWithAi } from '@/services/translateApi';
import { todayKey } from '@/utils/date';
import DateField from '@/components/common/DateField';
import { CHART_MARKS, chartMarksOf, POINTS_PER_QUESTION } from '@/constants/config';

const TAGS = ['सही उत्तर चुनें', 'खाली जगह भरें', 'सही या गलत'];
const MAX_OPTS = 4;
const LIMITS = { q: 1000, opt: 200, hint: 500, exp: 1000, title: 120 };
const LANGS = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'gu', label: 'ગુજરાતી' },
];
const labelOf = (code) => LANGS.find((l) => l.code === code).label;

const blank = (n) => ({ q: '', opts: Array(n).fill(''), hint: '', exp: '', title: '' });

/** Which language a piece of text is written in (by script). */
function detectLang(s = '') {
  if (/[઀-૿]/.test(s)) return 'gu';
  if (/[ऀ-ॿ]/.test(s)) return 'hi';
  return 'en';
}

function emptyForm() {
  return {
    date: todayKey(),
    category: 'murli',
    tag: TAGS[0],
    ans: null,
    max: POINTS_PER_QUESTION,
    active: 'hi',
    text: { hi: blank(3), en: blank(3), gu: blank(3) },
  };
}

function fromQuestion(x) {
  const n = x.category === 'murli' ? (x.opts || []).length : 3;
  const pick = (v) => ({
    q: v?.q || '',
    opts: Array.from({ length: n }, (_, i) => v?.opts?.[i] || ''),
    hint: v?.hint || '',
    exp: v?.exp || '',
    title: v?.title || '',
  });
  const text = { hi: blank(n), en: blank(n), gu: blank(n) };
  let active;
  if (x.i18n) {
    LANGS.forEach(({ code }) => {
      if (x.i18n[code]) text[code] = pick(x.i18n[code]);
    });
    active = LANGS.find(({ code }) => x.i18n[code])?.code || 'hi';
  } else {
    // older questions have one language only – put it in the matching tab, and fill the other
    // tabs from the built-in dictionary where it has them (the original murli questions do)
    active = detectLang(x.q);
    text[active] = pick(x);
    if (active === 'hi') {
      ['en', 'gu'].forEach((code) => {
        const tr = (s) => (s ? translateName(code, s) : '');
        if (tr(x.q) === x.q) return; // no translation known
        text[code] = pick({
          q: tr(x.q),
          opts: (x.opts || []).map(tr),
          hint: tr(x.hint),
          exp: tr(x.exp),
          title: tr(x.title),
        });
      });
    }
  }
  return {
    date: x.date,
    category: x.category,
    tag: x.category === 'murli' && x.tag ? x.tag : TAGS[0],
    ans: x.category === 'murli' ? x.ans : null,
    max: x.category === 'chart' ? chartMarksOf(x) : POINTS_PER_QUESTION,
    active,
    text,
  };
}

const filled = (f) => LANGS.map((l) => l.code).filter((c) => f.text[c].q.trim());

/** Same checks as firestore.rules, so the teacher sees the problem before saving. */
function validate(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return ['कृपया तारीख चुनें।'];
  const langs = filled(f);
  if (!langs.length) return ['कृपया प्रश्न लिखें।'];
  if (f.category === 'murli') {
    const n = f.text.hi.opts.length;
    if (n < 2) return ['कम से कम 2 विकल्प चाहिए।'];
    const missing = langs.find((c) => f.text[c].opts.some((o) => !o.trim()));
    if (missing) return ['कोई भी विकल्प खाली न छोड़ें।', labelOf(missing)];
    if (f.ans == null || f.ans >= n) return ['सही उत्तर चुनें।'];
  }
  return null;
}

/** Form state → what questionsRepo saves: main text = first filled language (Hindi first). */
function toPayload(f) {
  const langs = filled(f);
  const main = f.text[langs[0]];
  const i18n = Object.fromEntries(langs.map((c) => [c, f.text[c]]));
  return { date: f.date, category: f.category, tag: f.tag, ans: f.ans, max: f.max, ...main, i18n };
}

/**
 * Add / edit a question (full-screen sheet) in Hindi, English and Gujarati.
 * The teacher types in one language and can ask the AI (Gemini) to translate into the other two,
 * then review and correct each tab before saving.
 * @param initial  existing question to edit, or null to add a new one
 * @param onSave   async (payload) => void
 */
export default function QuestionForm({ initial, onSave, onClose }) {
  const { t, lang } = useLang();
  const [f, setF] = useState(() => (initial ? fromQuestion(initial) : emptyForm()));
  const [error, setError] = useState(null); // [message, languageLabel?]
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const letters = OPTION_LETTERS[lang];
  const cur = f.text[f.active];
  const murli = f.category === 'murli';

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const setCur = (patch) =>
    setF((prev) => ({ ...prev, text: { ...prev.text, [prev.active]: { ...prev.text[prev.active], ...patch } } }));
  const setOpt = (i, value) => setCur({ opts: cur.opts.map((o, k) => (k === i ? value : o)) });

  // adding / removing an option applies to every language so they stay aligned
  const mapAll = (fn) =>
    setF((prev) => ({
      ...prev,
      text: Object.fromEntries(LANGS.map(({ code }) => [code, { ...prev.text[code], opts: fn(prev.text[code].opts) }])),
    }));
  const addOpt = () => cur.opts.length < MAX_OPTS && mapAll((opts) => [...opts, '']);
  const removeOpt = (i) => {
    if (cur.opts.length <= 2) return;
    mapAll((opts) => opts.filter((_, k) => k !== i));
    set({ ans: f.ans === i ? null : f.ans != null && f.ans > i ? f.ans - 1 : f.ans });
  };

  const translate = async () => {
    if (!cur.q.trim()) {
      setError(['पहले इस भाषा में प्रश्न लिखें।']);
      return;
    }
    setError(null);
    setInfo('');
    setTranslating(true);
    try {
      const out = await translateWithAi({
        q: cur.q,
        opts: murli ? cur.opts : [],
        hint: murli ? cur.hint : '',
        exp: murli ? cur.exp : '',
        title: murli ? '' : cur.title,
      });
      setF((prev) => {
        const text = { ...prev.text };
        LANGS.forEach(({ code }) => {
          if (code === prev.active) return; // keep what the teacher typed
          const v = out[code];
          text[code] = {
            q: v.q,
            opts: murli ? prev.text[prev.active].opts.map((_, i) => v.opts[i] || '') : prev.text[code].opts,
            hint: v.hint,
            exp: v.exp,
            title: v.title,
          };
        });
        return { ...prev, text };
      });
      setInfo('अनुवाद हो गया। कृपया दूसरी भाषाएँ जाँचकर सहेजें।');
    } catch (err) {
      setError([
        err.code === 'no_key'
          ? 'अनुवाद सेवा अभी सेट नहीं है (Gemini API key नहीं मिली)।'
          : err.code === 'weekly_limit'
            ? 'इस सप्ताह की AI सीमा पूरी हो गई। सेटिंग्स में सीमा बढ़ाएँ या अगले सोमवार तक रुकें।'
          : err.code === 'offline'
            ? 'इंटरनेट नहीं है। फिर से कोशिश करें।'
            : 'अनुवाद नहीं हो पाया। फिर से कोशिश करें या स्वयं लिखें।',
      ]);
    } finally {
      setTranslating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave(toPayload(f));
    } catch {
      setError(['सहेजा नहीं जा सका। इंटरनेट जाँचकर फिर से कोशिश करें।']);
      setBusy(false);
    }
  };

  const disabled = busy || translating;

  return (
    <div className="qform-wrap" role="dialog" aria-modal="true" aria-label={t(initial ? 'प्रश्न बदलें' : 'नया प्रश्न')}>
      <form className="qform" onSubmit={submit} noValidate>
        <div className="qform-head">
          <h3>{t(initial ? 'प्रश्न बदलें' : 'नया प्रश्न')}</h3>
          <button type="button" className="iconbtn" aria-label={t('बंद करें')} onClick={onClose} disabled={disabled}>
            <Icon name="close" />
          </button>
        </div>

        <div className="qf-row two">
          <label className="qf">
            <span>{t('तारीख')}</span>
            <DateField value={f.date} onChange={(e) => set({ date: e.target.value })} required />
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

        {/* chart: how many marks the student can give themselves for this question */}
        {!murli && (
          <div className="qf">
            <span>{t('अंक')}</span>
            <div className="qf-seg" role="radiogroup">
              {CHART_MARKS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={f.max === m}
                  className={f.max === m ? 'on chart' : ''}
                  onClick={() => set({ max: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {murli && (
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
        )}

        {/* language tabs: type in one, translate into the others with the AI, then review */}
        <div className="qf-langs">
          <div className="qf-langtabs" role="tablist" aria-label={t('भाषा')}>
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={f.active === code}
                className={f.active === code ? 'on' : ''}
                onClick={() => set({ active: code })}
              >
                {label}
                {f.text[code].q.trim() && <i className="qf-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <button type="button" className="qf-ai" onClick={translate} disabled={disabled || !cur.q.trim()}>
            <Icon name="star" size={18} />
            {translating
              ? t('AI अनुवाद कर रहा है…')
              : `${t('AI से अनुवाद करें')} (${labelOf(f.active)} → ${LANGS.filter((l) => l.code !== f.active)
                  .map((l) => l.label)
                  .join(', ')})`}
          </button>
          {info && <p className="qf-info">{t(info)}</p>}
        </div>

        {!murli && (
          <label className="qf">
            <span>
              {t('शीर्षक')} <small>({t('वैकल्पिक')})</small>
            </span>
            <input
              type="text"
              value={cur.title}
              maxLength={LIMITS.title}
              placeholder={t('जैसे: अमृतवेला योग')}
              onChange={(e) => setCur({ title: e.target.value })}
            />
          </label>
        )}

        <label className="qf">
          <span>{t('प्रश्न')}</span>
          <textarea rows={3} value={cur.q} maxLength={LIMITS.q} onChange={(e) => setCur({ q: e.target.value })} />
        </label>

        {murli ? (
          <>
            <div className="qf">
              <span>
                {t('विकल्प')} · <small>{t('सही उत्तर पर टिक करें')}</small>
              </span>
              <div className="qf-opts">
                {cur.opts.map((o, i) => (
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
                    {cur.opts.length > 2 && (
                      <button type="button" className="qf-x" aria-label={t('विकल्प हटाएँ')} onClick={() => removeOpt(i)}>
                        <Icon name="close" size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {cur.opts.length < MAX_OPTS && (
                <button type="button" className="link qf-add" onClick={addOpt}>
                  + {t('विकल्प जोड़ें')}
                </button>
              )}
            </div>

            <label className="qf">
              <span>
                {t('संकेत')} <small>({t('वैकल्पिक')})</small>
              </span>
              <input type="text" value={cur.hint} maxLength={LIMITS.hint} onChange={(e) => setCur({ hint: e.target.value })} />
            </label>
            <label className="qf">
              <span>
                {t('मुरली का बिंदु')} <small>({t('वैकल्पिक')})</small>
              </span>
              <textarea rows={2} value={cur.exp} maxLength={LIMITS.exp} onChange={(e) => setCur({ exp: e.target.value })} />
            </label>
          </>
        ) : (
          <p className="note">
            {t(
              f.max === 10
                ? 'चार्ट प्रश्न में विद्यार्थी स्वयं 0 से 10 अंक लिखते हैं, इसलिए सही उत्तर नहीं होता।'
                : 'चार्ट प्रश्न में विद्यार्थी स्वयं 0 से 20 अंक लिखते हैं, इसलिए सही उत्तर नहीं होता।',
            )}
          </p>
        )}

        {error && (
          <p className="err">
            {error[1] ? `${error[1]}: ` : ''}
            {t(error[0])}
          </p>
        )}

        <div className="qform-actions">
          <button type="button" className="btn line" onClick={onClose} disabled={disabled}>
            {t('रद्द करें')}
          </button>
          <button type="submit" className="btn" disabled={disabled}>
            {t(busy ? 'सहेजा जा रहा है…' : 'सहेजें')}
          </button>
        </div>
      </form>
    </div>
  );
}
