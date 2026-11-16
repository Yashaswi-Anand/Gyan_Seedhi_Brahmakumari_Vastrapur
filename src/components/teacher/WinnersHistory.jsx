import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { rangeFor, watchResults, winnersHistory } from '@/services/resultsRepo';
import { parseDateKey } from '@/utils/date';

const KINDS = [
  ['weeks', 'साप्ताहिक'],
  ['months', 'मासिक'],
];
const PLACE = { 1: '1st', 2: '2nd', 3: '3rd' };

/** "9 – 15 November 2026", or "26 October – 1 November 2026" across two months. */
function weekLabel(from, to, cal) {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  const start = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${cal.months[a.getMonth()]}`;
  const yearA = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : '';
  return `${start}${yearA} – ${b.getDate()} ${cal.months[b.getMonth()]} ${b.getFullYear()}`;
}

/** Teacher results: the 1st / 2nd / 3rd students of every finished week and month (live). */
export default function WinnersHistory() {
  const { t, cal } = useLang();
  const [kind, setKind] = useState('weeks');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const [from, to] = rangeFor('all');
    return watchResults(
      from,
      to,
      (r) => {
        setResults(r);
        setError(false);
      },
      () => setError(true),
    );
  }, []);

  const history = useMemo(() => (results ? winnersHistory(results) : null), [results]);
  const periods = history ? history[kind] : [];

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="seg two" role="tablist">
        {KINDS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      {error && <p className="msg">{t('परिणाम लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
      {!results && !error && <p className="note">{t('परिणाम लोड हो रहे हैं…')}</p>}
      {history && !periods.length && (
        <p className="note">
          {t(kind === 'weeks' ? 'अभी कोई सप्ताह पूरा नहीं हुआ। सप्ताह सोमवार से रविवार तक गिना जाता है।' : 'अभी कोई महीना पूरा नहीं हुआ।')}
        </p>
      )}

      {periods.map((p) => {
        const [y, m] = p.key.split('-');
        return (
          <section key={p.key} className="win-period">
            <h3 className="win-head">
              <span>{kind === 'weeks' ? weekLabel(p.from, p.to, cal) : `${cal.months[+m - 1]} ${y}`}</span>
              <small>{t(`विद्यार्थी: ${p.students}`)}</small>
            </h3>
            {p.top.map((r) => (
              <div key={r.mobile} className={`win-row p${r.rank}`}>
                <span className="win-medal">
                  <Icon name="medal" size={20} />
                  <b>{t(`${PLACE[r.rank]} रैंक`)}</b>
                </span>
                <span className="win-name">
                  {r.name}
                  <small>
                    {t('मुरली')} {r.murli} · {t('चार्ट')} {r.chart} · {t(`${r.days} दिन`)}
                  </small>
                </span>
                <span className="win-total">
                  <b>{r.total}</b> {t('अंक')}
                </span>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
