/* The React context objects live here, apart from their providers.
   This file has no app imports, so editing translations or providers during development
   (Vite hot reload) never creates a second copy of a context – which used to blank the page
   with "useLang must be used inside <LanguageProvider>". */
import { createContext } from 'react';

export const LanguageContext = createContext(null);
export const AppContext = createContext(null);
export const QuestionsContext = createContext(null);
