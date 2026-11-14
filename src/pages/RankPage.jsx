import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { hasPlayedToday, rankRows } from '@/services/stats';
import { formatTime } from '@/utils/date';

const SCOPES = [
  ['today', 'आज'],
  ['week', 'इस सप्ताह'],
  ['month', 'इस महीने'],
  ['all', 'कुल'],
];

export default function RankPage() {
  const { user } = useApp();
  const { t, tn } = useLang();
  const [scope, setScope] = useState('today');
  const rows = rankRows(user, scope);

  return (
    <>
      <TopBar title="केन्द्र रैंक" />
      <div className="pad stack">
        <div className="seg">
          {SCOPES.map(([id, label]) => (
            <button key={id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>
              {t(label)}
            </button>
          ))}
        </div>

        {scope === 'today' && !hasPlayedToday(user) && (
          <p className="note">{t('आज का अभ्यास पूरा करने पर आपका नाम यहाँ जुड़ जाएगा।')}</p>
        )}

        {rows.map((r) => (
          <div key={(r.me ? 'me:' : '') + r.name} className={`rk${r.me ? ' me' : ''}${r.rank === 1 ? ' top1' : ''}`}>
            <div className="n">{r.rank}</div>
            <div className="nm">
              {tn(r.name)}
              {r.me && t(' (आप)')}
            </div>
            <div className="sc">
              {t(`${r.pts} अंक`)}
              <span>{formatTime(r.time)}</span>
            </div>
          </div>
        ))}

        <p className="note">
          {t(
            'रैंक अधिक अंकों से तय होती है; अंक बराबर हों तो कम समय वाले को आगे रखा जाता है। यह नमूना सूची है, असली सदस्य जुड़ने पर उनके नाम दिखेंगे।',
          )}
        </p>
      </div>
    </>
  );
}
