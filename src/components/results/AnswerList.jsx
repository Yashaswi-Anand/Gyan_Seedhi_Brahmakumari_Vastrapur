import { maxMarks } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';

/** One question: right answer (or chart marks), the student's earlier wrong picks, and the explanation on tap. */
function AnswerRow({ q, r, k }) {
  const { t, tq } = useLang();
  const self = q.type === 'self';
  const max = maxMarks(q);
  const answer = self
    ? r.timeout
      ? t('समय पूरा हुआ')
      : `${r.pts} / ${max}`
    : q.type === 'match'
      ? q.pairs.map((p) => `${tq(p[0])} → ${tq(p[1])}`).join('\n')
      : tq(q.opts[q.ans]);
  const icCls = self ? (r.pts === max ? 'y' : r.pts ? 'r' : 'n') : r.first ? 'y' : r.timeout ? 'n' : 'r';
  const icTxt = self ? (r.timeout ? '⏱' : r.pts) : r.first ? '✓' : r.timeout ? '⏱' : '↻';
  const label = t(`प्रश्न ${k + 1} · `) + (self ? t('चार्ट · ') + tq(q.ctxChip) : t('मुरली · ') + tq(q.tag));
  const wrong = !self && q.opts ? (r.wrong || []).filter((i) => q.opts[i] != null) : [];
  return (
    <details>
      <summary>
        <span className={`ic ${icCls}`}>{icTxt}</span>
        <span>
          <span className="qq">{label}</span>
          <br />
          <span className="aa" style={{ whiteSpace: 'pre-line' }}>
            {answer}
          </span>
          {wrong.length > 0 && (
            <span className="aw">
              {t('आपने पहले चुना: ')}
              {wrong.map((i) => tq(q.opts[i])).join(' · ')}
            </span>
          )}
        </span>
      </summary>
      <div className="more">
        {self ? (
          tq(q.q)
        ) : (
          <>
            <b className="mq">{tq(q.q)}</b>
            {q.exp && tq(q.exp)}
            {q.life && (
              <>
                <br />
                <br />
                {tq(q.life)}
              </>
            )}
          </>
        )}
      </div>
    </details>
  );
}

/** The day's questions with the student's results (`res[k]` matches `qs[k]`). */
export default function AnswerList({ qs, res }) {
  return (
    <div className="ans">
      {qs.map((q, k) => (
        <AnswerRow key={k} q={q} r={res[k] || { pts: 0, timeout: true }} k={k} />
      ))}
    </div>
  );
}
