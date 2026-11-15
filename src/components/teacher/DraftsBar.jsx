import { useState } from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { isPublished, publishQuestions } from '@/services/questionsRepo';
import { formatDateKey } from '@/utils/date';

/**
 * Shows how many questions are drafts (made or changed by the AI) and publishes them,
 * so students can see them. Hidden when there are no drafts.
 */
export default function DraftsBar({ questions }) {
  const { t, cal } = useLang();
  const { reload } = useQuestions();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const drafts = questions.filter((q) => !isPublished(q));
  if (!drafts.length && !msg) return null;

  const byDate = new Map();
  drafts.forEach((q) => byDate.set(q.date, (byDate.get(q.date) || 0) + 1));
  const summary = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([d, n]) => `${formatDateKey(d, cal)}: ${n}`)
    .join(' · ');

  const publish = async () => {
    setBusy(true);
    try {
      await publishQuestions(drafts.map((q) => q.id));
      setConfirm(false);
      setMsg('प्रश्न प्रकाशित हो गए। अब विद्यार्थी इन्हें देख सकते हैं।');
      reload(); // today's quiz picks them up
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('प्रकाशित नहीं हो पाया। इंटरनेट जाँचकर फिर से कोशिश करें।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {drafts.length > 0 ? (
        <div className="drafts-bar">
          <div>
            <b>{t(`${drafts.length} प्रश्न ड्राफ्ट में`)}</b>
            <span>{summary}</span>
            <small>{t('विद्यार्थी इन्हें प्रकाशित करने के बाद ही देखेंगे।')}</small>
          </div>
          <button className="btn" onClick={() => setConfirm(true)}>
            <Icon name="check" size={20} />
            {t('प्रकाशित करें')}
          </button>
        </div>
      ) : (
        <p className="drafts-done">{t(msg)}</p>
      )}
      {confirm && (
        <ConfirmDialog
          title="प्रश्न प्रकाशित करें?"
          message={`${t(`${drafts.length} प्रश्न`)} · ${summary}`}
          confirmLabel="हाँ, प्रकाशित करें"
          tone="primary"
          busy={busy}
          onConfirm={publish}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
