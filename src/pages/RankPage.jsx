import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import TopBar from '@/components/common/TopBar';
import DailyChart from '@/components/results/DailyChart';
import DayResultCard from '@/components/results/DayResultCard';
import ResultsSummary from '@/components/results/ResultsSummary';
import Leaderboard from '@/components/teacher/Leaderboard';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { hasAnswers } from '@/services/answers';
import { playsInScope, playsNewestFirst } from '@/services/stats';

const SCOPES = [
  ['week', 'इस सप्ताह'],
  ['month', 'इस महीने'],
  ['all', 'कुल'],
];

/** Group plays (already newest first) by "YYYY-MM". */
function byMonth(plays) {
  const groups = [];
  plays.forEach((p) => {
    const key = p.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.plays.push(p);
    else groups.push({ key, plays: [p] });
  });
  return groups;
}

/** Results tab: students see their own day-by-day results; the teacher sees every student ranked. */
export default function RankPage() {
  const { isTeacher } = useApp();
  if (isTeacher) {
    return (
      <>
        <TopBar title="विद्यार्थियों के परिणाम" />
        <Leaderboard />
      </>
    );
  }
  return <MyResults />;
}

function MyResults() {
  const { user } = useApp();
  const { t, cal } = useLang();
  const navigate = useNavigate();
  const [scope, setScope] = useState('week');
  const all = playsNewestFirst(user);
  const plays = playsInScope(all, scope);

  if (!all.length) {
    return (
      <>
        <TopBar title="मेरे परिणाम" />
        <div className="pad stack results">
          <div className="rempty">
            <span className="rempty-ic">
              <Icon name="trophy" size={34} />
            </span>
            <p>{t('अभी कोई अभ्यास नहीं हुआ। आज का अभ्यास शुरू करें।')}</p>
            <button className="btn" onClick={() => navigate('/quiz')}>
              {t('अभ्यास शुरू करें')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="मेरे परिणाम" />
      <div className="pad stack results">
        <div className="seg three" role="tablist">
          {SCOPES.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={scope === id}
              className={scope === id ? 'on' : ''}
              onClick={() => setScope(id)}
            >
              {t(label)}
            </button>
          ))}
        </div>

        <ResultsSummary plays={plays} />

        <DailyChart plays={plays} />

        {plays.some(hasAnswers) && <p className="note anshint">{t('पिछले 7 दिनों के कार्ड पर टैप करके उस दिन के उत्तर देखें।')}</p>}

        {plays.length ? (
          byMonth(plays).map((g) => {
            const [y, m] = g.key.split('-');
            return (
              <section key={g.key} className="monthgrp">
                <h3 className="monthhead">
                  <span>
                    {cal.months[+m - 1]} {y}
                  </span>
                  <small>{t(`${g.plays.length} दिन`)}</small>
                </h3>
                <div className="stack" style={{ gap: 12 }}>
                  {g.plays.map((p) => (
                    <DayResultCard key={p.date} play={p} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <p className="note">{t('इस अवधि में कोई अभ्यास नहीं हुआ।')}</p>
        )}
      </div>
    </>
  );
}
