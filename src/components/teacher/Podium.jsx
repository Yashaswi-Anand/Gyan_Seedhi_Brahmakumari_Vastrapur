import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';

const PLACE = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * The 1st / 2nd / 3rd ranked students (ties share a place), from rankStudents() rows.
 * @param horizontal side-by-side compact columns (teacher Home); default is a vertical list
 */
export default function Podium({ rows, horizontal = false }) {
  const { t } = useLang();
  const top = rows.filter((r) => r.rank <= 3);
  if (!top.length) return null;
  return (
    <section className={`podium${horizontal ? ' row' : ''}`} aria-label={t('शीर्ष 3 विद्यार्थी')}>
      {top.map((r) => (
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
            <span>
              {t('मुरली')} {r.murli}
            </span>
            <span className="sep"> · </span>
            <span>
              {t('चार्ट')} {r.chart}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}
