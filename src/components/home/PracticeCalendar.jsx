import { useMemo, useState } from 'react';
import Icon from '@/components/common/Icon';
import PointsSplit from '@/components/common/PointsSplit';
import { useLang } from '@/context/LanguageContext';
import { chartPts, murliPts } from '@/services/stats';
import { formatLong, pad, parseDateKey, todayKey } from '@/utils/date';

const DEFAULT_MAX = 100;
// short labels inside each day box
const SHORT = { hi: ['मुरली', 'चार्ट'], en: ['Murli', 'Chart'], gu: ['મુરલી', 'ચાર્ટ'] };
const monthIndex = (y, m) => y * 12 + m;

/**
 * Month-by-month practice calendar: murli / chart marks on each practised day,
 * a monthly summary, ★ on full-marks days, and the day's details on tap.
 */
export default function PracticeCalendar({ user }) {
  const { t, lang, cal } = useLang();
  const [mLbl, cLbl] = SHORT[lang] || SHORT.hi;
  const now = new Date();
  const today = todayKey();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(null);

  const byDate = useMemo(() => {
    const map = {};
    user.plays.forEach((p) => (map[p.date] = p));
    return map;
  }, [user.plays]);

  // months you can move between: from the first practice month up to this month
  const first = useMemo(() => {
    const keys = Object.keys(byDate).sort();
    const d = keys.length ? parseDateKey(keys[0]) : now;
    return monthIndex(d.getFullYear(), d.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDate]);
  const current = monthIndex(now.getFullYear(), now.getMonth());
  const shown = monthIndex(view.y, view.m);

  const go = (step) => {
    const i = shown + step;
    setView({ y: Math.floor(i / 12), m: i % 12 });
    setSel(null);
  };

  const { y, m } = view;
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const isThisMonth = shown === current;
  const daysSoFar = isThisMonth ? now.getDate() : daysInMonth;

  // this month's summary
  let practised = 0;
  let murliSum = 0;
  let chartSum = 0;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`b${i}`} className="blank" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const p = byDate[key];
    const cls = ['d'];
    if (key === today) cls.push('today');
    if (key > today) cls.push('future');
    if (!p) {
      cells.push(
        <div key={key} className={cls.join(' ')}>
          <span className="dn">{d}</span>
        </div>,
      );
      continue;
    }
    practised++;
    const mp = murliPts(p);
    const cp = chartPts(p);
    murliSum += mp;
    chartSum += cp;
    const perfect = mp + cp >= (p.mMax ?? DEFAULT_MAX) + (p.cMax ?? DEFAULT_MAX);
    cls.push('p');
    if (perfect) cls.push('perfect');
    if (sel === key) cls.push('sel');
    cells.push(
      <button
        key={key}
        type="button"
        className={cls.join(' ')}
        aria-pressed={sel === key}
        aria-label={`${formatLong(parseDateKey(key), cal)} · ${t('मुरली अंक')} ${mp} · ${t('चार्ट अंक')} ${p.cPts ?? '–'}`}
        onClick={() => setSel(sel === key ? null : key)}
      >
        {perfect && <span className="star" aria-hidden="true">★</span>}
        <span className="dn">{d}</span>
        <span className="mk">
          <i className="m">
            <small>{mLbl}</small>
            {mp}
          </i>
          <i className="c">
            <small>{cLbl}</small>
            {p.cPts != null ? p.cPts : '–'}
          </i>
        </span>
      </button>,
    );
  }

  const pct = daysSoFar ? Math.round((practised / daysSoFar) * 100) : 0;
  const selPlay = sel ? byDate[sel] : null;

  return (
    <section className="calsec">
      <div className="calhead">
        <h3>{t('अभ्यास का कैलेंडर')}</h3>
        <div className="calnav">
          <button type="button" onClick={() => go(-1)} disabled={shown <= first} aria-label={t('पिछला महीना')}>
            <Icon name="back" size={18} />
          </button>
          <b>
            {cal.months[m]} {y}
          </b>
          <button type="button" className="next" onClick={() => go(1)} disabled={shown >= current} aria-label={t('अगला महीना')}>
            <Icon name="back" size={18} />
          </button>
        </div>
      </div>

      <div className="calsum">
        <div className="cs-days">
          <span>{t('अभ्यास के दिन')}</span>
          <b>
            {practised}
            <small> / {daysSoFar}</small>
          </b>
          <div className="calbar" role="img" aria-label={`${pct}%`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="cs-pts m">
          <span>{t('मुरली अंक')}</span>
          <b>{murliSum}</b>
        </div>
        <div className="cs-pts c">
          <span>{t('चार्ट अंक')}</span>
          <b>{chartSum}</b>
        </div>
      </div>

      <div className="cal">
        {cal.days1.map((d, i) => (
          <div key={`h${i}`} className="h">
            {d}
          </div>
        ))}
        {cells}
      </div>

      {selPlay ? (
        <div className="calday">
          <b>{formatLong(parseDateKey(sel), cal)}</b>
          <PointsSplit
            murli={murliPts(selPlay)}
            chart={chartPts(selPlay)}
            murliMax={selPlay.mMax ?? DEFAULT_MAX}
            chartMax={selPlay.cMax ?? DEFAULT_MAX}
          />
          <small>
            {t('कुल अंक')}: {murliPts(selPlay) + chartPts(selPlay)} / {(selPlay.mMax ?? DEFAULT_MAX) + (selPlay.cMax ?? DEFAULT_MAX)}
          </small>
        </div>
      ) : (
        practised > 0 && <p className="calhint">{t('किसी दिन पर टैप करके उस दिन के अंक देखें।')}</p>
      )}

      <div className="callg">
        <span>
          <i className="lg-m" />
          {t('मुरली अंक')}
        </span>
        <span>
          <i className="lg-c" />
          {t('चार्ट अंक')}
        </span>
        <span>
          <em className="lg-star">★</em>
          {t('पूरे अंक')}
        </span>
      </div>
    </section>
  );
}
