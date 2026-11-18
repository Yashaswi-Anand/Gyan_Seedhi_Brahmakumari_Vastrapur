import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { pendingToday, rangeFor, rankStudents, watchResults } from '@/services/resultsRepo';
import { formatDateKey, todayKey } from '@/utils/date';
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
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' (not done today)
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState(null); // last ACTIVE_DAYS days, for the "आज बाकी" list

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

  useEffect(() => {
    const [from, to] = rangeFor('active');
    return watchResults(from, to, setRecent, () => setRecent([]));
  }, []);

  const rows = useMemo(() => (results ? rankStudents(results) : []), [results]);
  const pending = useMemo(() => (recent ? pendingToday(recent, todayKey()) : null), [recent]);

  return (
    <div className="pad stack results">
      <div className="seg three" role="tablist">
        {SCOPES.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={scope === id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      {scope !== 'winners' && (
        <div className="lbfilter" role="group" aria-label={t('विद्यार्थी दिखाएँ')}>
          <button className={filter === 'all' ? 'on' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            {t('सभी विद्यार्थी')}
          </button>
          <button
            className={`pend${filter === 'pending' ? ' on' : ''}`}
            aria-pressed={filter === 'pending'}
            onClick={() => setFilter('pending')}
          >
            {t('आज बाकी')}
            <span className="cnt">{pending ? pending.length : '…'}</span>
          </button>
        </div>
      )}

      {scope === 'winners' ? (
        <WinnersHistory />
      ) : filter === 'pending' ? (
        <PendingList pending={pending} />
      ) : (
        <Ranking results={results} error={error} rows={rows} />
      )}
    </div>
  );
}

/** Students who practised in the last 30 days (ACTIVE_DAYS) but not today: name, last day, call button. */
function PendingList({ pending }) {
  const { t, cal } = useLang();
  if (!pending) return <p className="note">{t('परिणाम लोड हो रहे हैं…')}</p>;
  return (
    <>
      {pending.length ? (
        <section className="lb pendlist" aria-label={t('आज बाकी')}>
          {pending.map((s) => (
            <div key={s.mobile} className="pend-row">
              <span className="pend-av" aria-hidden="true">
                {String(s.name || '?').trim().charAt(0)}
              </span>
              <span className="lb-name">
                {s.name}
                <small>
                  {t('आखिरी अभ्यास:')} {formatDateKey(s.lastDate, cal)}
                </small>
              </span>
              <a className="pend-call" href={`tel:${s.mobile}`} aria-label={`${t('फ़ोन करें')} ${s.name}`}>
                <Icon name="phone" size={18} />
                <span>{s.mobile}</span>
              </a>
            </div>
          ))}
        </section>
      ) : (
        <div className="pend-done">
          <Icon name="check" size={26} />
          <p>{t('सभी विद्यार्थियों ने आज का अभ्यास कर लिया है।')}</p>
        </div>
      )}
    </>
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
