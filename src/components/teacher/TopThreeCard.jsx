import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { rangeFor, rankStudents, watchResults } from '@/services/resultsRepo';
import Podium from './Podium';

const SCOPES = [
  ['week', 'इस सप्ताह', 'इस सप्ताह के शीर्ष 3 विद्यार्थी'],
  ['month', 'इस महीने', 'इस महीने के शीर्ष 3 विद्यार्थी'],
];

/** Teacher home: the top 3 students of this week or this month (live), with a link to the full results. */
export default function TopThreeCard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [scope, setScope] = useState('week');

  useEffect(() => {
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
    <section className="top3-card">
      <div className="top3-head">
        <h3>{t(SCOPES.find(([id]) => id === scope)[2])}</h3>
        <button className="link" onClick={() => navigate('/rank')}>
          {t('सभी परिणाम देखें')}
        </button>
      </div>
      <div className="seg two" role="tablist">
        {SCOPES.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={scope === id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>
            {t(label)}
          </button>
        ))}
      </div>
      {error && <p className="note">{t('परिणाम लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
      {!results && !error && <p className="note">{t('परिणाम लोड हो रहे हैं…')}</p>}
      {results && !rows.length && <p className="note">{t('इस अवधि में किसी विद्यार्थी का परिणाम नहीं है।')}</p>}
      <Podium rows={rows} horizontal />
    </section>
  );
}
