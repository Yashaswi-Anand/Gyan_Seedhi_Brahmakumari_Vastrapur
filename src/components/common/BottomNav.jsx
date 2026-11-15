import { NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import Icon from './Icon';

const HOME = { to: '/', label: 'होम', icon: 'home' };
const RESULTS = { to: '/rank', label: 'परिणाम', icon: 'trophy' };
const QA = { to: '/questions', label: 'AI', icon: 'chat' };
const PROFILE = { to: '/profile', label: 'प्रोफ़ाइल', icon: 'user' };

export default function BottomNav() {
  const { t } = useLang();
  const { isTeacher } = useApp();
  // the Question/Answer tab is shown only to the teacher
  const tabs = isTeacher ? [HOME, RESULTS, QA, PROFILE] : [HOME, RESULTS, PROFILE];
  return (
    <nav className={`nav${tabs.length === 4 ? ' four' : ''}`} aria-label={t('मुख्य मेनू')}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon name={tab.icon} size={26} />
          <span>{t(tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
