import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/context/LanguageContext';
import { rangeFor, rankStudents, watchResults } from '@/services/resultsRepo';
import Podium from './Podium';
import WinnersHistory from './WinnersHistory';

// scores start from zero every month, so there is no all-time ranking; past winners are kept instead
const SCOPES = [
  ['week', 'इस सप्ताह'],
  ['month', 'इस महीने'],
  ['winners', 'विजेता इतिहास'],
];

/** Teacher view: every student's murli, chart and total marks, ranked; updates live. */
export default function Leaderboard() {
  const { t } = useLang();
  const [scope, setScope] = useState('week');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (scope === 'winners') return undefined;
    setResults(null);
    const [from, to] = rangeFor(scope);
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

  return (
    <div className="pad stack results">
      <div className="seg three" role="tablist">
        {SCOPES.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={scope === id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      {scope === 'winners' ? <WinnersHistory /> : <Ranking results={results} error={error} rows={rows} />}
    </div>
  );
}

function Ranking({ results, error, rows }) {
  const { t } = useLang();
  return (
    <>
      {error && <p className="msg">{t('परिणाम लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
      {!results && !error && <p className="note">{t('परिणाम लोड हो रहे हैं…')}</p>}
      {results && !rows.length && <p className="note">{t('इस अवधि में किसी विद्यार्थी का परिणाम नहीं है।')}</p>}

      <Podium rows={rows} />

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
    </>
  );
}
