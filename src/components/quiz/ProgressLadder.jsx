import { useLang } from '@/context/LanguageContext';

/**
 * Step bar, one step per question.
 * @param gapAt index of the first chart question; a small gap separates murli and chart steps
 * @param marks most marks the current question gives (murli 20, chart 10 or 20)
 */
export default function ProgressLadder({ total, index, gapAt = -1, marks }) {
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
        {t('इस प्रश्न के ')}
        <b>{marks}</b>
        {t(' अंक')}
      </div>
    </div>
  );
}
