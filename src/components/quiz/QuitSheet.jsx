import { useLang } from '@/context/LanguageContext';

export default function QuitSheet({ onStay, onQuit }) {
  const { t } = useLang();
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <div>
        <h3 style={{ fontSize: 22 }}>{t('बाहर निकलें?')}</h3>
        <p className="muted">{t('आज का अभ्यास सहेजा नहीं जाएगा।')}</p>
        <button className="btn" onClick={onStay}>
          {t('अभ्यास जारी रखें')}
        </button>
        <button className="btn line" onClick={onQuit}>
          {t('बाहर निकलें')}
        </button>
      </div>
    </div>
  );
}
