import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { OPTION_LETTERS } from '@/i18n/calendar';
import { formatDateKey } from '@/utils/date';

const LANG_BADGE = { hi: 'हि', en: 'En', gu: 'ગુ' };

/** One question, shown in the teacher's current language when that version exists. */
function QuestionPreview({ q, number }) {
  const { t, lang, cal } = useLang();
  const v = q.i18n?.[lang] || q.i18n?.hi || q;
  const murli = q.category === 'murli';
  const letters = OPTION_LETTERS[lang];
  return (
    <div className="pv-q">
      <div className="qa-top">
        {number && <span className="qa-n">{number}</span>}
        <span className="pv-date">{formatDateKey(q.date, cal)}</span>
        <span className={`chip cat${murli ? '' : ' ch'}`}>{t(murli ? 'मुरली' : 'चार्ट')}</span>
        {murli && q.tag && <span className="chip">{t(q.tag)}</span>}
        {!murli && v.title && <span className="chip gold">{v.title}</span>}
        <span className="qa-langs">
          {['hi', 'en', 'gu']
            .filter((l) => q.i18n?.[l])
            .map((l) => LANG_BADGE[l])
            .join(' · ')}
        </span>
      </div>
      <p className="qa-q">{v.q}</p>
      {murli && (
        <ol className="qa-opts">
          {(v.opts || []).map((o, i) => (
            <li key={i} className={i === q.ans ? 'right' : ''}>
              <span className="lt">{i === q.ans ? <Icon name="check" size={16} /> : letters[i]}</span>
              <span>{o}</span>
            </li>
          ))}
        </ol>
      )}
      {murli && (v.hint || v.exp) && (
        <div className="qa-extra">
          {v.hint && (
            <p>
              <b>{t('संकेत:')}</b> {v.hint}
            </p>
          )}
          {v.exp && (
            <p>
              <b>{t('मुरली का बिंदु')}:</b> {v.exp}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const TITLES = {
  propose_add_questions: 'नए प्रश्न जोड़ें?',
  propose_update_question: 'प्रश्न बदलें?',
  propose_delete_questions: 'प्रश्न हटाएँ?',
};
const APPLY = {
  propose_add_questions: 'जोड़ें',
  propose_update_question: 'बदलें',
  propose_delete_questions: 'हाँ, हटाएँ',
};
const DONE = {
  propose_add_questions: 'जोड़ दिए गए',
  propose_update_question: 'बदल दिया गया',
  propose_delete_questions: 'हटा दिए गए',
};

/**
 * A change Claude proposes. status: 'pending' | 'working' | 'applied' | 'cancelled' | 'invalid' | 'failed'
 */
export default function ProposalCard({ name, input, checked, status, numbers, onApply, onCancel }) {
  const { t } = useLang();
  const del = name === 'propose_delete_questions';
  const open = status === 'pending' || status === 'working';

  return (
    <div className={`proposal${del ? ' del' : ''} st-${status}`}>
      <div className="pv-head">
        <b>{t(TITLES[name])}</b>
        {input?.note && <span className="pv-note">{input.note}</span>}
      </div>

      {checked?.error ? (
        <p className="pv-invalid">{t('Claude का प्रस्ताव अधूरा था; उसे ठीक करने को कहा गया है।')}</p>
      ) : name === 'propose_add_questions' ? (
        checked.questions.map((q, i) => <QuestionPreview key={i} q={q} />)
      ) : name === 'propose_update_question' ? (
        <>
          <p className="pv-label">{t('पहले')}</p>
          <QuestionPreview q={checked.existing} number={numbers?.get(checked.existing.id)} />
          <p className="pv-label">{t('बाद में')}</p>
          <QuestionPreview q={checked.question} />
        </>
      ) : (
        checked.questions.map((q) => <QuestionPreview key={q.id} q={q} number={numbers?.get(q.id)} />)
      )}

      {open && !checked?.error && (
        <div className="pv-actions">
          <button className="btn line" onClick={onCancel} disabled={status === 'working'}>
            {t('रद्द करें')}
          </button>
          <button className={`btn${del ? ' danger' : ''}`} onClick={onApply} disabled={status === 'working'}>
            {status === 'working' ? t('सहेजा जा रहा है…') : t(APPLY[name])}
          </button>
        </div>
      )}
      {status === 'applied' && (
        <p className="pv-status ok">
          <Icon name="check" size={16} /> {t(DONE[name])}
        </p>
      )}
      {status === 'cancelled' && <p className="pv-status">{t('रद्द किया गया')}</p>}
      {status === 'failed' && <p className="pv-status bad">{t('सहेजा नहीं जा सका। इंटरनेट जाँचकर फिर से कोशिश करें।')}</p>}
    </div>
  );
}
