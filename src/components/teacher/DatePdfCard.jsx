import { useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { buildQuestions } from '@/data/questions';
import { registerQuestionTranslations } from '@/i18n/translate';
import { downloadQuestionPaper } from '@/services/pdf';
import { fetchQuestionsForDate, isPublished } from '@/services/questionsRepo';
import { formatDateKey, todayKey } from '@/utils/date';
import DateField from '@/components/common/DateField';

/** Teacher home: pick any date and download that day's question paper (no answers) as PDF. */
export default function DatePdfCard() {
  const { t, lang, cal } = useLang();
  const [date, setDate] = useState(todayKey());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const download = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || busy) return;
    setBusy(true);
    setMsg({ text: 'PDF बन रही है…', bad: false });
    try {
      const docs = await fetchQuestionsForDate(date);
      if (!docs.length) {
        setMsg({ text: 'इस तारीख के प्रश्न नहीं हैं।', bad: true });
        return;
      }
      registerQuestionTranslations(docs); // so the paper follows the chosen language
      await downloadQuestionPaper(lang, buildQuestions(docs), formatDateKey(date, cal), {
        dateKeyForFile: date,
        heading: 'प्रश्न-पत्र',
        sub: 'दिनांक',
      });
      setMsg({
        text: docs.some((q) => !isPublished(q)) ? 'PDF डाउनलोड हो गई। (ड्राफ्ट प्रश्न भी शामिल हैं)' : 'PDF डाउनलोड हो गई।',
        bad: false,
      });
    } catch {
      setMsg({ text: 'PDF तैयार नहीं हो पाई। फिर से कोशिश करें।', bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="datepdf">
      <div className="datepdf-head">
        <span className="dlic">
          <Icon name="download" size={22} />
        </span>
        <div>
          <b>{t('तारीख के अनुसार प्रश्न-पत्र (PDF)')}</b>
          <small>{t('बिना उत्तर के, सभी प्रश्न और विकल्प')}</small>
        </div>
      </div>
      <div className="datepdf-row">
        <DateField value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('तारीख')} />
        <button className="btn" onClick={download} disabled={busy || !date}>
          {t(busy ? 'PDF बन रही है…' : 'डाउनलोड')}
        </button>
      </div>
      {msg.text && <p className={msg.bad ? 'err' : 'set-ok'}>{t(msg.text)}</p>}
    </section>
  );
}
