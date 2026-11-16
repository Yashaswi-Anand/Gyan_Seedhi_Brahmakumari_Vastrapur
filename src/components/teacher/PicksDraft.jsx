import { useState } from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DateField from '@/components/common/DateField';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { clearPicks, removePick, usePicks } from '@/services/picks';
import { addQuestion } from '@/services/questionsRepo';
import { formatDateKey, parseDateKey, todayKey } from '@/utils/date';
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
  const [date, setDate] = useState(''); // no default: the teacher must choose the date
  const [tried, setTried] = useState(false); // publish tapped without a valid date
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const okDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today;

  // grouped by murli date (oldest murli first), ticking order within a group;
  // published in this same order, so the numbers shown are the order students see
  const groups = [];
  for (const p of picks) {
    const g = groups.find((x) => x.murliDate === (p.murliDate || ''));
    if (g) g.items.push(p);
    else groups.push({ murliDate: p.murliDate || '', items: [p] });
  }
  groups.sort((a, b) => (!a.murliDate ? 1 : !b.murliDate ? -1 : a.murliDate < b.murliDate ? -1 : a.murliDate > b.murliDate ? 1 : 0));
  const ordered = groups.flatMap((g) => g.items);
  const numberOf = new Map(ordered.map((p, i) => [p.key, i + 1]));
  const existing = questions.filter((q) => q.date === date && q.category === 'murli').length;

  const publish = async () => {
    setBusy(true);
    setError('');
    let saved = 0;
    try {
      // one by one, in the order shown (that is the order students see)
      for (const p of ordered) {
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

      {groups.map((g) => (
        <section key={g.murliDate || 'none'} className="qa-day">
          <h3 className="monthhead">
            <span>
              {g.murliDate
                ? `${t('मुरली')}: ${cal.days[parseDateKey(g.murliDate).getDay()]}, ${formatDateKey(g.murliDate, cal)}`
                : t('मुरली की तारीख नहीं दी गई')}
            </span>
            <small>{t(`${g.items.length} प्रश्न`)}</small>
          </h3>
          <div className="stack" style={{ gap: 12 }}>
            {g.items.map((p) => (
              <article key={p.key} className="qa-item pick">
                <div className="pick-head">
                  <span className="qa-n">{numberOf.get(p.key)}</span>
                  <button className="qa-btn del" onClick={() => removePick(p.key)} disabled={busy}>
                    <Icon name="close" size={18} />
                    {t('हटाएँ')}
                  </button>
                </div>
                <QuestionPreview q={p.question} showDate={false} />
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="pick-publish">
        <label className="qf">
          <span>
            {t('किस तारीख के लिए?')} <b className="req">*</b>
          </span>
          <DateField
            value={date}
            min={today}
            required
            placeholder={t('तारीख चुनें')}
            className={tried && !okDate ? 'invalid' : ''}
            aria-label={t('तारीख')}
            aria-invalid={tried && !okDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {date && !okDate && <p className="err">{t('आज या आगे की तारीख चुनें।')}</p>}
        {!date && tried && <p className="err">{t('तारीख चुनना ज़रूरी है।')}</p>}
        {okDate && existing > 0 && (
          <p className="note">{t(`इस तारीख पर पहले से ${existing} मुरली प्रश्न हैं। नए प्रश्न उनके बाद जुड़ेंगे।`)}</p>
        )}
        {error && <p className="err">{t(error)}</p>}
        <button
          className="btn"
          onClick={() => (okDate ? setConfirm(true) : setTried(true))}
          disabled={busy || !picks.length}
        >
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
