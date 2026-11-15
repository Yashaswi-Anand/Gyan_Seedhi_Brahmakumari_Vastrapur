import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import PointsSplit from '@/components/common/PointsSplit';
import TopBar from '@/components/common/TopBar';
import GrowthTree from '@/components/tree/GrowthTree';
import WheelBlock from '@/components/wheel/WheelBlock';
import { MAX_POINTS, POINTS_PER_QUESTION as PERQ } from '@/constants/config';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { leafCount, treeStage } from '@/services/stats';
import { formatTime } from '@/utils/date';
import { prefersReducedMotion } from '@/utils/helpers';

/** Counts the score up from 0 once when the screen opens. */
function useCountUp(target, ms = 800) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setValue(Math.round(target * p));
      if (p >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, ms]);
  return value;
}

function AnswerRow({ q, r, k }) {
  const { t } = useLang();
  const self = q.type === 'self';
  const answer = self
    ? r.timeout
      ? t('समय पूरा हुआ')
      : `${r.pts} / ${PERQ}`
    : q.type === 'match'
      ? q.pairs.map((p) => `${t(p[0])} → ${t(p[1])}`).join('\n')
      : t(q.opts[q.ans]);
  const icCls = self ? (r.pts === PERQ ? 'y' : r.pts ? 'r' : 'n') : r.first ? 'y' : r.timeout ? 'n' : 'r';
  const icTxt = self ? (r.timeout ? '⏱' : r.pts) : r.first ? '✓' : r.timeout ? '⏱' : '↻';
  const label = t(`प्रश्न ${k + 1} · `) + (self ? t('चार्ट · ') + t(q.ctxChip) : t('मुरली · ') + t(q.tag));
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
        </span>
      </summary>
      <div className="more">
        {self ? (
          t(q.q)
        ) : (
          <>
            {t(q.exp)}
            {q.life && (
              <>
                <br />
                <br />
                {t(q.life)}
              </>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export default function ResultPage() {
  const { user, lastQuiz } = useApp();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const shown = useCountUp(lastQuiz?.summary.tot ?? 0);

  if (!lastQuiz) return <Navigate to="/" replace />;
  const { qs, res, summary: R } = lastQuiz;
  const leaves = leafCount(user);

  const firstLine =
    lang === 'en'
      ? `${R.first} of ${R.qn} answers right on the first try`
      : lang === 'gu'
        ? `${R.qn} માંથી ${R.first} જવાબ પહેલી વારમાં સાચા`
        : `${R.qn} में से ${R.first} उत्तर पहली बार में सही`;

  return (
    <>
      <TopBar title="आज का परिणाम" logo lang={false} />
      <div className="pad stack" style={{ gap: 18 }}>
        <div className="hero2 one">
          <p className="eyebrow">{t(R.practice ? 'अभ्यास (अंक नहीं जुड़े)' : 'आज के अंक')}</p>
          <h2 className="hbig">
            <span>{shown}</span> <small>/ {MAX_POINTS}</small>
          </h2>
          <p className="hsub">{firstLine}</p>
          <PointsSplit murli={R.mp} chart={R.sp} murliMax={R.qn * PERQ} chartMax={R.sn * PERQ} />
        </div>

        <div className="tiles two" style={{ margin: 0 }}>
          <div className="tile">
            <b>{R.acc}%</b>
            <span>{t('सटीकता')}</span>
          </div>
          <div className="tile">
            <b>{formatTime(R.time)}</b>
            <span>{t('कुल समय')}</span>
          </div>
        </div>

        {!R.practice && <WheelBlock />}

        {R.saved && (
          <div className="card treecard">
            <div className="treebox sm">
              <GrowthTree leaves={leaves} fresh={leaves - 1} />
            </div>
            <div>
              <b style={{ fontSize: 19 }}>{t('वृक्ष पर नया पत्ता जुड़ा')}</b>
              <p className="muted small">{t(`${treeStage(leaves)} · ${leaves} पत्ते`)}</p>
            </div>
          </div>
        )}

        {R.newB.length > 0 && (
          <div className="card stack" style={{ gap: 8 }}>
            <b>{t('नया बैज मिला')}</b>
            {R.newB.map((b) => (
              <div className="row" key={b.id}>
                <span className="chip gold">
                  <Icon name="star" size={16} />
                  {t(b.t)}
                </span>
                <span className="muted small">{t(b.d)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sec">
          <h3>{t('सही उत्तर')}</h3>
          <div className="ans">
            {qs.map((q, k) => (
              <AnswerRow key={k} q={q} r={res[k]} k={k} />
            ))}
          </div>
        </div>

        <button className="btn soft" onClick={() => navigate('/rank')}>
          {t('मेरे परिणाम देखें')}
        </button>
        <button className="btn line" onClick={() => navigate('/')}>
          {t('होम पर जाएँ')}
        </button>
      </div>
    </>
  );
}
