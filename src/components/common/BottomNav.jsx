import { NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import Icon from './Icon';

const HOME = { to: '/', label: 'होम', icon: 'home' };
const RESULTS = { to: '/rank', label: 'परिणाम', icon: 'trophy' };
const QA = { to: '/questions', label: 'AI', icon: 'chat' };
const SETTINGS = { to: '/settings', label: 'सेटिंग्स', icon: 'gear' };
const PROFILE = { to: '/profile', label: 'प्रोफ़ाइल', icon: 'user' };

export default function BottomNav() {
  const { t } = useLang();
  const { isTeacher } = useApp();
  // the AI and Settings tabs are shown only to the teacher
  const tabs = isTeacher ? [HOME, RESULTS, QA, SETTINGS, PROFILE] : [HOME, RESULTS, PROFILE];
  return (
    <nav className={`nav${tabs.length === 5 ? ' five' : ''}`} aria-label={t('मुख्य मेनू')}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon name={tab.icon} size={26} />
          <span>{t(tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
