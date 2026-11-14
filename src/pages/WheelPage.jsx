import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/common/TopBar';
import WheelBlock from '@/components/wheel/WheelBlock';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { hasPlayedToday } from '@/services/stats';

export default function WheelPage() {
  const { user } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  return (
    <>
      <TopBar title="वरदान चक्र" backTo="/" />
      <div className="pad stack" style={{ gap: 18 }}>
        {hasPlayedToday(user) ? (
          <WheelBlock />
        ) : (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              {t('आज का अभ्यास पूरा करने पर चक्र खुलेगा।')}
            </p>
            <button className="btn" onClick={() => navigate('/quiz')}>
              {t('अभ्यास शुरू करें')}
            </button>
          </>
        )}
      </div>
    </>
  );
}
