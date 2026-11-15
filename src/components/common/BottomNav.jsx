import { NavLink } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import Icon from './Icon';

const TABS = [
  { to: '/', label: 'होम', icon: 'home' },
  { to: '/rank', label: 'परिणाम', icon: 'trophy' },
  { to: '/profile', label: 'प्रोफ़ाइल', icon: 'user' },
];

export default function BottomNav() {
  const { t } = useLang();
  return (
    <nav className="nav" aria-label={t('मुख्य मेनू')}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon name={tab.icon} size={26} />
          <span>{t(tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
