import { useEffect, useState } from 'react';
import { useLang } from '@/context/LanguageContext';
import { canPromptInstall, isInstalled, isIos, onInstallChange, promptInstall } from '@/services/pwa';
import Icon from './Icon';
import Logo from './Logo';

/** "Install as an app": a button where the browser supports it, otherwise the manual steps. */
export default function InstallAppCard() {
  const { t } = useLang();
  const [, refresh] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => onInstallChange(() => refresh((n) => n + 1)), []);

  if (isInstalled() || done) return null;

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') setDone(true);
  };

  return (
    <section className="install-card">
      <div className="install-head">
        <Logo size={44} />
        <div>
          <b>{t('ऐप की तरह इंस्टॉल करें')}</b>
          <small>{t('फ़ोन की होम स्क्रीन पर ज्ञान सीढ़ी का आइकॉन आ जाएगा और ऐप पूरी स्क्रीन पर खुलेगा।')}</small>
        </div>
      </div>
      {canPromptInstall() ? (
        <button className="btn" onClick={install}>
          <Icon name="download" size={20} />
          {t('ऐप इंस्टॉल करें')}
        </button>
      ) : isIos() ? (
        <ol className="install-steps">
          <li>{t('Safari में नीचे Share बटन (⬆️ वाला चौकोर) दबाएँ।')}</li>
          <li>{t('"Add to Home Screen" (होम स्क्रीन में जोड़ें) चुनें।')}</li>
          <li>{t('ऊपर "Add" दबाएँ।')}</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>{t('ब्राउज़र का मेनू (⋮) खोलें।')}</li>
          <li>{t('"Install app" या "Add to Home screen" चुनें।')}</li>
        </ol>
      )}
    </section>
  );
}
