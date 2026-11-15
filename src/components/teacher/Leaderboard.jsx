import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { rankStudents, watchResults } from '@/services/resultsRepo';
import { addDays, dateKey, todayKey } from '@/utils/date';

const SCOPES = [
  ['week', 'इस सप्ताह'],
  ['month', 'इस महीने'],
  ['all', 'कुल'],
];

function range(scope) {
  const today = todayKey();
  if (scope === 'week') return [dateKey(addDays(new Date(), -6)), today];
  if (scope === 'month') return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`];
  return ['0000-01-01', '9999-12-31'];
}

const PLACE = { 1: '1st', 2: '2nd', 3: '3rd' };

/** Teacher view: every student's murli, chart and total marks, ranked; updates live. */
export default function Leaderboard() {
  const { t } = useLang();
  const [scope, setScope] = useState('week');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setResults(null);
    const [from, to] = range(scope);
    return watchResults(
      from,
      to,
      (r) => {
        setResults(r);
        setError(false);
      },
      () => setError(true),
    );
  }, [scope]);

  const rows = useMemo(() => (results ? rankStudents(results) : []), [results]);
  const podium = rows.filter((r) => r.rank <= 3);

  return (
    <div className="pad stack results">
      <div className="seg three" role="tablist">
        {SCOPES.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={scope === id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      {error && <p className="msg">{t('परिणाम लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
      {!results && !error && <p className="note">{t('परिणाम लोड हो रहे हैं…')}</p>}
      {results && !rows.length && <p className="note">{t('इस अवधि में किसी विद्यार्थी का परिणाम नहीं है।')}</p>}

      {podium.length > 0 && (
        <section className="podium" aria-label={t('शीर्ष 3 विद्यार्थी')}>
          {podium.map((r) => (
            <div key={r.mobile} className={`pod p${r.rank}`}>
              <span className="pod-medal">
                <Icon name="medal" size={22} />
                <b>{t(`${PLACE[r.rank]} रैंक`)}</b>
              </span>
              <span className="pod-name">{r.name}</span>
              <span className="pod-total">
                <b>{r.total}</b> {t('अंक')}
              </span>
              <span className="pod-split">
                {t('मुरली')} {r.murli} · {t('चार्ट')} {r.chart}
              </span>
            </div>
          ))}
        </section>
      )}

      {rows.length > 0 && (
        <section className="lb" aria-label={t('सभी विद्यार्थी')}>
          <div className="lb-head" aria-hidden="true">
            <span>{t('रैंक')}</span>
            <span>{t('नाम')}</span>
            <span>{t('मुरली')}</span>
            <span>{t('चार्ट')}</span>
            <span>{t('कुल')}</span>
          </div>
          {rows.map((r) => (
            <div key={r.mobile} className={`lb-row${r.rank <= 3 ? ` top p${r.rank}` : ''}`}>
              <span className="lb-rank">{r.rank}</span>
              <span className="lb-name">
                {r.name}
                <small>{t(`${r.days} दिन`)}</small>
              </span>
              <span className="lb-num">{r.murli}</span>
              <span className="lb-num">{r.chart}</span>
              <span className="lb-num lb-total">{r.total}</span>
            </div>
          ))}
        </section>
      )}

      <p className="note">
        {t('रैंक कुल अंकों (मुरली + चार्ट) से तय होती है। बराबर अंक होने पर विद्यार्थियों को एक ही रैंक मिलती है।')}
      </p>
    </div>
  );
}
