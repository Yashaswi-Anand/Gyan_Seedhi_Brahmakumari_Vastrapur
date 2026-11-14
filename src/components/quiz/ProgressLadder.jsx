import { POINTS_PER_QUESTION } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';

/** Step bar for the 10 questions (gap between murli and chart halves comes from CSS). */
export default function ProgressLadder({ total, index }) {
  const { t } = useLang();
  return (
    <div className="ladder">
      <div className="steps">
        {Array.from({ length: total }, (_, k) => (
          <i key={k} className={k < index ? 'done' : k === index ? 'now' : ''} />
        ))}
      </div>
      <div className="pts">
        {t('हर प्रश्न ')}
        <b>{POINTS_PER_QUESTION}</b>
        {t(' अंक')}
      </div>
    </div>
  );
}
