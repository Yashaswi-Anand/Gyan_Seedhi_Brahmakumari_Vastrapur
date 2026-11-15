import { useLang } from '@/context/LanguageContext';
import { chartPts, murliPts } from '@/services/stats';
import { sum } from '@/utils/helpers';

/** Overview at the top of the results tab, for the plays in the selected period. */
export default function ResultsSummary({ plays }) {
  const { t } = useLang();
  const days = new Set(plays.map((p) => p.date)).size;
  const avg = plays.length ? Math.round(sum(plays, (p) => p.acc) / plays.length) : 0;
  const stats = [
    [days, 'अभ्यास के दिन'],
    [`${avg}%`, 'औसत सटीकता'],
    [sum(plays, murliPts), 'मुरली अंक'],
    [sum(plays, chartPts), 'चार्ट अंक'],
  ];
  return (
    <section className="rsum" aria-label={t('मेरे परिणाम')}>
      {stats.map(([value, label]) => (
        <div key={label} className="rsum-i">
          <b>{value}</b>
          <span>{t(label)}</span>
        </div>
      ))}
    </section>
  );
}
