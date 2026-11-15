import { useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import TopBar from '@/components/common/TopBar';
import GrowthTree from '@/components/tree/GrowthTree';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { BADGES } from '@/data/badges';
import {
  earnedBadgeIds,
  leafCount,
  levelInfo,
  streaks,
  totalChart,
  totalMurli,
  totalPts,
  treeStage,
} from '@/services/stats';
import { sum } from '@/utils/helpers';

export default function ProfilePage() {
  const { user, logout } = useApp();
  const { t, tn } = useLang();
  const navigate = useNavigate();

  const pts = totalPts(user);
  const lv = levelInfo(pts);
  const st = streaks(user.plays);
  const have = earnedBadgeIds(user);
  const leaves = leafCount(user);
  const avg = user.plays.length ? Math.round(sum(user.plays, (p) => p.acc) / user.plays.length) : 0;
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
            <GrowthTree leaves={leaves} />
          </div>
          <div>
            <b style={{ fontSize: 19 }}>{t('मेरा वृक्ष')}</b>
            <p className="muted small">{t(`${treeStage(leaves)} · ${leaves} पत्ते`)}</p>
            <p className="tiny">{t('हर दिन के अभ्यास पर एक नया पत्ता')}</p>
          </div>
        </div>

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
            [totalMurli(user), 'मुरली अंक'],
            [totalChart(user), 'चार्ट अंक'],
            [pts, 'कुल अंक'],
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
          className="link"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          {t('दूसरा खाता खोलें')}
        </button>
      </div>
    </>
  );
}
