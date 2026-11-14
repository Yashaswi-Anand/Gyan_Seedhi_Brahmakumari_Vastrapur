import { TIME_LIMIT } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';

const CIRC = 138.23; // 2πr for r = 22

/** Circular countdown; turns gold in the last 10 seconds. */
export default function Timer({ timeLeft }) {
  const { t } = useLang();
  return (
    <div className={`timer${timeLeft <= 10 ? ' low' : ''}`} role="timer" aria-label={t('बचा हुआ समय')}>
      <svg viewBox="0 0 52 52" width="52" height="52">
        <circle cx="26" cy="26" r="22" className="tr-bg" />
        <circle
          cx="26"
          cy="26"
          r="22"
          className="tr-fg"
          strokeDasharray={CIRC}
          strokeDashoffset={(CIRC * (1 - timeLeft / TIME_LIMIT)).toFixed(1)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span>{Math.ceil(timeLeft)}</span>
    </div>
  );
}
