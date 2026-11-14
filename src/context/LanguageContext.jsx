import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, translateName } from '@/i18n/translate';
import { CENTRE_NAME } from '@/constants/config';
import { APP_TITLE, CALENDAR } from '@/i18n/calendar';
import { loadLang, saveLang } from '@/services/storage';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  const setLang = useCallback((l) => {
    const next = l === 'en' || l === 'gu' ? l : 'hi';
    saveLang(next);
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${APP_TITLE[lang]} | ${CENTRE_NAME}`;
    document.body.classList.toggle('en', lang === 'en');
    document.body.classList.toggle('gu', lang === 'gu');
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      /** Translate a Hindi UI string. */
      t: (s) => translate(lang, s),
      /** Translate a person's name only if it is a known (demo) name. */
      tn: (s) => translateName(lang, s),
      /** Pick the current language from a { hi, en, gu } object. */
      v: (o) => o[lang] || o.hi,
      cal: CALENDAR[lang],
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
