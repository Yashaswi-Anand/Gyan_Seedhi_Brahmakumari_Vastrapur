import { useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import TopBar from '@/components/common/TopBar';
import GrowthTree from '@/components/tree/GrowthTree';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { BADGES } from '@/data/badges';
import {
  daysInMonth,
  earnedBadgeIds,
  leafCount,
  levelInfo,
  monthChart,
  monthMurli,
  monthPlays,
  monthPts,
  streaks,
  treeStage,
} from '@/services/stats';
import { sum } from '@/utils/helpers';

export default function ProfilePage() {
  const { user, logout } = useApp();
  const { t, tn, cal } = useLang();
  const navigate = useNavigate();

  // points, level and accuracy count from the 1st of this month; badges and streaks are for all time
  const pts = monthPts(user);
  const lv = levelInfo(pts);
  const st = streaks(user.plays);
  const have = earnedBadgeIds(user);
  const leaves = leafCount(user);
  const total = daysInMonth();
  const mp = monthPlays(user);
  const avg = mp.length ? Math.round(sum(mp, (p) => p.acc) / mp.length) : 0;
  const maskedMobile = user.mobile.slice(0, 2) + '••••••' + user.mobile.slice(-2);
  const displayName = tn(user.name);

  return (
    <>
      <TopBar title="मेरी प्रोफ़ाइल" />
      <div className="pad stack" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 16 }}>
          <div className="avatar">{displayName.charAt(0)}</div>
          <div>
            <h2 style={{ fontSize: 24 }}>{displayName}</h2>
            <p className="muted small">
              {t('मोबाइल ') + maskedMobile}
            </p>
          </div>
        </div>

        <div className="card treecard">
          <div className="treebox sm">
            <GrowthTree leaves={leaves} total={total} />
          </div>
          <div>
            <b style={{ fontSize: 19 }}>{t('मेरा वृक्ष')}</b>
            <p className="muted small">{t(`${treeStage(leaves, total)} · ${leaves} / ${total} पत्ते`)}</p>
            <p className="tiny">{t('महीने के हर दिन का एक पत्ता; हर महीने नया वृक्ष')}</p>
          </div>
        </div>

        <p className="muted small" style={{ margin: '0 0 -10px' }}>
          {cal.months[new Date().getMonth()]} · {t('हर महीने की 1 तारीख से अंक शून्य से शुरू होते हैं।')}
        </p>

        <div className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{t(`स्तर ${lv.n}`)}</b>
            <span className="muted small">
              {t(lv.next ? `${lv.next - pts} अंक बाद स्तर ${lv.n + 1}` : 'सर्वोच्च स्तर')}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${lv.pct}%` }} />
          </div>
        </div>

        <div className="tiles" style={{ margin: 0, gridTemplateColumns: 'repeat(2,1fr)' }}>
          {[
            [monthMurli(user), 'मुरली अंक'],
            [monthChart(user), 'चार्ट अंक'],
            [pts, 'इस महीने के अंक'],
            [`${avg}%`, 'औसत सटीकता'],
            [st.cur, 'अभी की लड़ी (दिन)'],
            [st.best, 'सबसे लम्बी लड़ी'],
          ].map(([val, label]) => (
            <div className="tile" key={label}>
              <b>{val}</b>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>

        <div className="sec">
          <h3>{t('मेरे बैज')}</h3>
          <div className="badges">
            {BADGES.map((b) => {
              const on = have[b.id];
              return (
                <div key={b.id} className={`bdg${on ? '' : ' off'}`} title={t(b.d)}>
                  <div className="disc">
                    <Icon name={on ? 'star' : 'lock'} size={26} />
                  </div>
                  {t(b.t)}
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="btn line"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          {t('लॉगआउट')}
        </button>
      </div>
    </>
  );
}
