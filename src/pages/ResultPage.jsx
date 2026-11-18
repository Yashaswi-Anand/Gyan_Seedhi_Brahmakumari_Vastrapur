import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import PointsSplit from '@/components/common/PointsSplit';
import TopBar from '@/components/common/TopBar';
import AnswerList from '@/components/results/AnswerList';
import Celebration from '@/components/results/Celebration';
import GrowthTree from '@/components/tree/GrowthTree';
import WheelBlock from '@/components/wheel/WheelBlock';
import { POINTS_PER_QUESTION as PERQ } from '@/constants/config';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { daysInMonth, leafCount, treeStage } from '@/services/stats';
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
      <Celebration />
      <div className="pad stack" style={{ gap: 18 }}>
        <div className="congrats" role="status">
          <h2>{t('बधाई हो!')}</h2>
          <p>{t(R.practice ? 'अभ्यास पूरा हुआ' : 'आज का अभ्यास पूरा हुआ')}</p>
        </div>

        <div className="hero2 one">
          <p className="eyebrow">{t(R.practice ? 'अभ्यास (अंक नहीं जुड़े)' : 'आज के अंक')}</p>
          <h2 className="hbig">
            <span>{shown}</span> <small>/ {qs.length * PERQ}</small>
          </h2>
          <p className="hsub">{firstLine}</p>
          <PointsSplit murli={R.mp} chart={R.sp} murliMax={R.qn * PERQ} chartMax={R.sn * PERQ} />
        </div>

        {/* the leaf for today grows onto the tree */}
        {R.saved && (
          <div className="card treecard newleaf">
            <div className="treebox md">
              <GrowthTree leaves={leaves} fresh={leaves - 1} />
            </div>
            <div>
              <b style={{ fontSize: 19 }}>{t('वृक्ष पर नया पत्ता जुड़ा')}</b>
              <p className="muted small">{t(`${treeStage(leaves)} · ${leaves} / ${daysInMonth()} पत्ते`)}</p>
            </div>
          </div>
        )}

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
          <AnswerList qs={qs} res={res} />
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
