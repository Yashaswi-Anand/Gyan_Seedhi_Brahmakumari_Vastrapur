import { POINTS_PER_QUESTION } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';

/**
 * Step bar, one step per question.
 * @param gapAt index of the first chart question; a small gap separates murli and chart steps
 */
export default function ProgressLadder({ total, index, gapAt = -1 }) {
  const { t } = useLang();
  return (
    <div className="ladder">
      <div className="steps">
        {Array.from({ length: total }, (_, k) => (
          <i
            key={k}
            className={[k < index ? 'done' : k === index ? 'now' : '', k === gapAt && k > 0 ? 'gap' : '']
              .filter(Boolean)
              .join(' ')}
          />
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
