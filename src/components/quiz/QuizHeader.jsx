import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import Timer from './Timer';

export default function QuizHeader({ index, total, timeLeft, onClose }) {
  const { t } = useLang();
  return (
    <div className="qtop">
      <button className="iconbtn" aria-label={t('बाहर निकलें')} onClick={onClose}>
        <Icon name="close" />
      </button>
      <div className="qcount">
        {t('प्रश्न ')}
        <b>{index + 1}</b> / {total}
      </div>
      {/* keyed so the ring resets without animating back between questions */}
      <Timer key={index} timeLeft={timeLeft} />
    </div>
  );
}
