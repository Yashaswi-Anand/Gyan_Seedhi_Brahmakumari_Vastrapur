import { useLang } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/calendar';

export default function LanguageSwitch() {
  const { lang, setLang } = useLang();
  return (
    <span className="langseg" role="group" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={lang === l.code ? 'on' : ''}
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </span>
  );
}
