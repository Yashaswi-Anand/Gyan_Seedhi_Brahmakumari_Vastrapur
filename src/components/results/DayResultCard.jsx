import { useMemo, useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { answerToQuestion, hasAnswers } from '@/services/answers';
import { murliPts } from '@/services/stats';
import { parseDateKey, todayKey } from '@/utils/date';
import AnswerList from './AnswerList';

/** Older plays don't store their maximum marks; those days had 5 + 5 questions of 20 marks. */
const DEFAULT_MAX = 100;

/** green ≥ 80%, gold ≥ 50%, rose below */
const accTone = (acc) => (acc >= 80 ? 'good' : acc >= 50 ? 'mid' : 'low');

function ScoreBar({ label, value, max, tone }) {
  const pct = typeof value === 'number' && max ? Math.round((value / max) * 100) : 0;
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

/** One practice day: date tile, accuracy, day total, murli / chart bars; tap (latest 7 days) to see that day's answers. */
export default function DayResultCard({ play }) {
  const { t, cal } = useLang();
  const d = parseDateKey(play.date);
  const isToday = play.date === todayKey();
  const murli = murliPts(play);
  const chart = play.cPts != null ? play.cPts : null;
  const mMax = play.mMax ?? DEFAULT_MAX;
  const cMax = play.cMax ?? DEFAULT_MAX;
  const total = murli + (chart ?? 0);
  const canOpen = hasAnswers(play);
  const [open, setOpen] = useState(false);
  const qs = useMemo(() => (open && canOpen ? play.answers.map(answerToQuestion) : null), [open, canOpen, play.answers]);

  const body = (
    <>
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
          <span>/ {mMax + cMax}</span>
        </div>
      </div>
      <div className="daybars">
        <ScoreBar label={t('मुरली')} value={murli} max={mMax} tone="m" />
        <ScoreBar label={t('चार्ट')} value={chart ?? '—'} max={cMax} tone="c" />
      </div>
    </>
  );

  if (!canOpen) return <article className={`daycard${isToday ? ' is-today' : ''}`}>{body}</article>;

  return (
    <article className={`daycard tappable${isToday ? ' is-today' : ''}${open ? ' open' : ''}`}>
      <button type="button" className="daytap" aria-expanded={open} onClick={() => setOpen(!open)}>
        {body}
        <span className="daymore">
          {t(open ? 'उत्तर छिपाएँ' : 'उत्तर देखें')}
          <Icon name="back" size={16} />
        </span>
      </button>
      {qs && (
        <div className="dayans">
          <AnswerList qs={qs} res={play.answers} />
        </div>
      )}
    </article>
  );
}
