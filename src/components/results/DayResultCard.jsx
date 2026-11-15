import { POINTS_PER_QUESTION } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';
import { CHART_QUESTIONS, MURLI_QUESTIONS } from '@/data/questions';
import { murliPts } from '@/services/stats';
import { parseDateKey, todayKey } from '@/utils/date';

export const MURLI_MAX = MURLI_QUESTIONS.length * POINTS_PER_QUESTION;
export const CHART_MAX = CHART_QUESTIONS.length * POINTS_PER_QUESTION;

/** green ≥ 80%, gold ≥ 50%, rose below */
const accTone = (acc) => (acc >= 80 ? 'good' : acc >= 50 ? 'mid' : 'low');

function ScoreBar({ label, value, max, tone }) {
  const pct = typeof value === 'number' ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`sbar ${tone}`}>
      <span className="sbar-l">{label}</span>
      <span className="sbar-t" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="sbar-v">
        <b>{value}</b>/{max}
      </span>
    </div>
  );
}

/** One practice day: date tile, accuracy, day total, and murli / chart bars. */
export default function DayResultCard({ play }) {
  const { t, cal } = useLang();
  const d = parseDateKey(play.date);
  const isToday = play.date === todayKey();
  const murli = murliPts(play);
  const chart = play.cPts != null ? play.cPts : null;
  const total = murli + (chart ?? 0);

  return (
    <article className={`daycard${isToday ? ' is-today' : ''}`}>
      <div className="dayhead">
        <div className="datetile">
          <b>{d.getDate()}</b>
          <span>{cal.months[d.getMonth()]}</span>
        </div>
        <div className="daymeta">
          <b>{cal.days[d.getDay()]}</b>
          <span className="daychips">
            {isToday && <span className="chip today">{t('आज')}</span>}
            <span className={`chip acc ${accTone(play.acc)}`}>{t(`सटीकता ${play.acc}%`)}</span>
          </span>
        </div>
        <div className="daytotal">
          <b>{total}</b>
          <span>/ {MURLI_MAX + CHART_MAX}</span>
        </div>
      </div>
      <div className="daybars">
        <ScoreBar label={t('मुरली')} value={murli} max={MURLI_MAX} tone="m" />
        <ScoreBar label={t('चार्ट')} value={chart ?? '—'} max={CHART_MAX} tone="c" />
      </div>
    </article>
  );
}
