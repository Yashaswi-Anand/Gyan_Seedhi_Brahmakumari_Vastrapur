import { useLang } from '@/context/LanguageContext';
import { murliPts } from '@/services/stats';
import { formatLong, pad, parseDateKey, todayKey } from '@/utils/date';

const SHORT = { hi: ['मुरली', 'चार्ट'], en: ['Murli', 'Chart'], gu: ['મુરલી', 'ચાર્ટ'] };

/** This month's calendar with murli / chart points on each practice day. */
export default function PracticeCalendar({ user }) {
  const { t, lang, cal } = useLang();
  const [mLbl, cLbl] = SHORT[lang];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayKey();
  const byDate = {};
  user.plays.forEach((p) => (byDate[p.date] = p));

  const cells = [];
  let count = 0;
  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`b${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const p = byDate[key];
    const cls = 'd' + (key === today ? ' today' : '');
    if (p) {
      count++;
      cells.push(
        <div key={key} className={`${cls} p`} title={formatLong(parseDateKey(key), cal)}>
          {d}
          <span className="mk">
            <i className="m">
              <small>{mLbl}</small>
              {murliPts(p)}
            </i>
            <i className="c">
              <small>{cLbl}</small>
              {p.cPts != null ? p.cPts : '–'}
            </i>
          </span>
        </div>,
      );
    } else {
      cells.push(
        <div key={key} className={cls}>
          {d}
        </div>,
      );
    }
  }

  return (
    <div className="calsec">
      <h3>{t('अभ्यास का कैलेंडर')}</h3>
      <p className="tiny" style={{ marginBottom: 10 }}>
        {cal.months[m]} {y} · {t(`${count} दिन अभ्यास`)}
      </p>
      <div className="cal">
        {cal.days1.map((d, i) => (
          <div key={`h${i}`} className="h">
            {d}
          </div>
        ))}
        {cells}
      </div>
      <div className="callg">
        <span>
          <i style={{ background: 'var(--red)' }} />
          <b style={{ color: 'var(--red)' }}>{t('मुरली अंक')}</b>
        </span>
        <span>
          <i style={{ background: '#A87A22' }} />
          <b style={{ color: '#A87A22' }}>{t('चार्ट अंक')}</b>
        </span>
      </div>
    </div>
  );
}
