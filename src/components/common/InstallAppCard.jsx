import { useEffect, useState } from 'react';
import { useLang } from '@/context/LanguageContext';
import { canPromptInstall, isInstalled, onInstallChange, promptInstall } from '@/services/pwa';
import Icon from './Icon';

/** "Install app" button – shown only where the browser offers installing (Chrome / Edge) and not yet installed. */
export default function InstallAppCard() {
  const { t } = useLang();
  const [, refresh] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => onInstallChange(() => refresh((n) => n + 1)), []);

  if (isInstalled() || done || !canPromptInstall()) return null;

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') setDone(true);
  };

  return (
    <button className="btn" onClick={install}>
      <Icon name="download" size={20} />
      {t('ऐप इंस्टॉल करें')}
    </button>
  );
}
