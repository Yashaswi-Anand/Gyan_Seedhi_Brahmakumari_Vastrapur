import { useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import Icon from './Icon';
import LanguageSwitch from './LanguageSwitch';
import Logo from './Logo';

/**
 * Page header.
 * @param title     Hindi title (translated here)
 * @param logo      show the centre logo before the title
 * @param backTo    show a back button that navigates to this path
 * @param lang      show the language switch (default true)
 */
export default function TopBar({ title, logo = false, backTo, lang = true }) {
  const { t } = useLang();
  const navigate = useNavigate();
  return (
    <div className="top">
      {backTo && (
        <button className="iconbtn" aria-label={t('वापस')} onClick={() => navigate(backTo)}>
          <Icon name="back" />
        </button>
      )}
      <div className="brand">
        {logo && <Logo size={34} />}
        <span>{t(title)}</span>
      </div>
      {backTo ? <span style={{ width: 44 }} /> : lang ? <LanguageSwitch /> : null}
    </div>
  );
}
