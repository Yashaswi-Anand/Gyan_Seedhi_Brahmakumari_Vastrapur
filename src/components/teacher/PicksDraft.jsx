import { useState } from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DateField from '@/components/common/DateField';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { clearPicks, removePick, usePicks } from '@/services/picks';
import { addQuestion } from '@/services/questionsRepo';
import { formatDateKey, todayKey } from '@/utils/date';
import { QuestionPreview } from './ProposalCard';

/**
 * Draft tab: the questions the teacher ticked in the AI chat. The teacher chooses a date and
 * publishes them all for that date; the tab then disappears.
 */
export default function PicksDraft({ questions, onPublished }) {
  const { t, cal } = useLang();
  const { reload } = useQuestions();
  const picks = usePicks();
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const okDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today;
  const existing = questions.filter((q) => q.date === date && q.category === 'murli').length;

  const publish = async () => {
    setBusy(true);
    setError('');
    let saved = 0;
    try {
      // one by one, in the order they were ticked (that is the order students see)
      for (const p of picks) {
        await addQuestion({ ...p.question, date }, { published: true });
        removePick(p.key);
        saved++;
      }
      clearPicks();
      setConfirm(false);
      reload(); // today's quiz picks them up
      onPublished(date, saved);
    } catch {
      setConfirm(false);
      setError(
        saved
          ? `${saved} प्रश्न प्रकाशित हुए, बाकी नहीं हो पाए। इंटरनेट जाँचकर फिर से कोशिश करें।`
          : 'प्रकाशित नहीं हो पाया। इंटरनेट जाँचकर फिर से कोशिश करें।',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pad stack picks">
      <p className="note">{t('AI चैट में जिन प्रश्नों पर ✓ लगाया, वे यहाँ हैं। तारीख चुनकर प्रकाशित करें।')}</p>

      {picks.map((p, i) => (
        <article key={p.key} className="qa-item pick">
          <div className="pick-head">
            <span className="qa-n">{i + 1}</span>
            {p.murliDate && (
              <small>
                {t('मुरली')}: {formatDateKey(p.murliDate, cal)}
              </small>
            )}
            <button className="qa-btn del" onClick={() => removePick(p.key)} disabled={busy}>
              <Icon name="close" size={18} />
              {t('हटाएँ')}
            </button>
          </div>
          <QuestionPreview q={p.question} showDate={false} />
        </article>
      ))}

      <section className="pick-publish">
        <label className="qf">
          <span>{t('किस तारीख के लिए?')}</span>
          <DateField value={date} min={today} aria-label={t('तारीख')} onChange={(e) => setDate(e.target.value)} />
        </label>
        {!okDate && <p className="err">{t('आज या आगे की तारीख चुनें।')}</p>}
        {okDate && existing > 0 && (
          <p className="note">{t(`इस तारीख पर पहले से ${existing} मुरली प्रश्न हैं। नए प्रश्न उनके बाद जुड़ेंगे।`)}</p>
        )}
        {error && <p className="err">{t(error)}</p>}
        <button className="btn" onClick={() => setConfirm(true)} disabled={!okDate || busy || !picks.length}>
          <Icon name="check" size={20} />
          {t('प्रकाशित करें')} ({picks.length})
        </button>
      </section>

      {confirm && (
        <ConfirmDialog
          title="प्रश्न प्रकाशित करें?"
          message={`${t(`${picks.length} प्रश्न`)} · ${formatDateKey(date, cal)}`}
          confirmLabel="हाँ, प्रकाशित करें"
          tone="primary"
          busy={busy}
          onConfirm={publish}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
