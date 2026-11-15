import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QuestionsContext } from './contextObjects';
import { SEED_DATE, buildQuestions, seedQuestionDocs } from '@/data/questions';
import { registerQuestionTranslations } from '@/i18n/translate';
import { fetchQuestionSet } from '@/services/questionsRepo';
import { todayKey } from '@/utils/date';

/**
 * Today's question set from Firestore: questions dated today, or the latest earlier date.
 * status: 'loading' | 'ready' | 'offline' (Firestore unreachable → built-in questions).
 */
export function QuestionsProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', date: null, docs: [] });

  const reload = useCallback(async () => {
    try {
      const { date, questions } = await fetchQuestionSet(todayKey());
      registerQuestionTranslations(questions); // before render, so text shows in the chosen language
      setState({ status: 'ready', date, docs: questions });
    } catch {
      setState({ status: 'offline', date: SEED_DATE, docs: seedQuestionDocs() });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ ...state, questions: buildQuestions(state.docs), reload }),
    [state, reload],
  );
  return <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>;
}

export function useQuestions() {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error('useQuestions must be used inside <QuestionsProvider>');
  return ctx;
}
