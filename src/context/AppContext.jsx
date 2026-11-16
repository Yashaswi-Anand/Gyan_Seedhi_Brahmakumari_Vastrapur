import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from './contextObjects';
import { DEMO_ACCOUNT, isTeacherMobile } from '@/constants/config';
import { pruneAllAnswers, pruneAnswers } from '@/services/answers';
import { fetchStudentResults, markAllSynced, resultToPlay, syncPlays } from '@/services/resultsRepo';
import {
  createUserRecord,
  loadSession,
  loadUsers,
  saveSession,
  saveUsers,
} from '@/services/storage';
import { addDays, dateKey, todayKey } from '@/utils/date';

/** Sample history for the demo account: [daysAgo, murliPts, firstTryRight, timeSec, chartPts]. */
const DEMO_HISTORY = [
  [1, 80, 4, 190, 60], [2, 60, 3, 230, 80], [3, 80, 4, 170, 40], [4, 60, 3, 250, 100],
  [5, 100, 5, 160, 72], [7, 80, 4, 200, 55], [9, 60, 3, 240, 90], [10, 80, 4, 180, 64],
];

export function AppProvider({ children }) {
  const [db, setDb] = useState(() => pruneAllAnswers(loadUsers()));
  const [session, setSession] = useState(loadSession);
  /** Last finished quiz ({ qs, res, summary }) so the result screen can show it. */
  const [lastQuiz, setLastQuiz] = useState(null);

  useEffect(() => {
    saveUsers(db);
  }, [db]);
  useEffect(() => {
    saveSession(session);
  }, [session]);

  const user = session && db[session] ? db[session] : null;
  const isTeacher = !!user && isTeacherMobile(user.mobile);

  // Send this student's saved results to Firestore so the teacher's ranking includes them.
  // Skipped for the teacher and the sample account; retried when the device comes back online.
  const syncKey = user ? `${user.mobile}:${user.plays.length}` : '';
  useEffect(() => {
    if (!user || isTeacher || user.mobile === DEMO_ACCOUNT.mobile) return undefined;
    syncPlays(user);
    const onOnline = () => syncPlays(user);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, isTeacher]);

  // Days saved from another phone (same number) are added to this phone's history, once per app open.
  const merged = useRef(new Set());
  useEffect(() => {
    if (!user || isTeacher || user.mobile === DEMO_ACCOUNT.mobile || merged.current.has(user.mobile)) return;
    const mobile = user.mobile;
    merged.current.add(mobile);
    fetchStudentResults(mobile)
      .then((results) => {
        if (!results.length) return;
        markAllSynced(mobile, results.map((r) => r.date));
        setDb((prev) => {
          const u = prev[mobile];
          if (!u) return prev;
          const have = new Set(u.plays.map((p) => p.date));
          const extra = results.filter((r) => !have.has(r.date)).map(resultToPlay);
          if (!extra.length) return prev;
          const plays = [...u.plays, ...extra].sort((a, b) => (a.date < b.date ? -1 : 1));
          return { ...prev, [mobile]: { ...u, plays } };
        });
      })
      .catch(() => merged.current.delete(mobile)); // offline: try again next time
  }, [user, isTeacher]);

  const updateUser = useCallback(
    (fn) => {
      setDb((prev) => {
        const u = prev[session];
        if (!u) return prev;
        return { ...prev, [session]: fn(u) };
      });
    },
    [session],
  );

  const login = useCallback((mobile) => setSession(mobile), []);

  const logout = useCallback(() => {
    setSession(null);
    setLastQuiz(null);
  }, []);

  /** A number already saved in Firestore: bring back its name and every saved day on this phone. */
  const restore = useCallback((mobile, results) => {
    const latest = results[results.length - 1];
    markAllSynced(mobile, results.map((r) => r.date));
    setDb((prev) => {
      const u = createUserRecord(mobile, latest.name, '');
      u.plays = results.map(resultToPlay);
      u.created = results[0].date;
      return { ...prev, [mobile]: u };
    });
    setSession(mobile);
  }, []);

  const register = useCallback((mobile, name, role) => {
    setDb((prev) => ({ ...prev, [mobile]: createUserRecord(mobile, name, role) }));
    setSession(mobile);
  }, []);

  const openDemo = useCallback(() => {
    const { mobile, name, role } = DEMO_ACCOUNT;
    setDb((prev) => {
      if (prev[mobile]) return prev;
      const u = createUserRecord(mobile, name, role);
      u.plays = DEMO_HISTORY.map(([ago, m, first, time, c]) => ({
        date: dateKey(addDays(new Date(), -ago)),
        points: m + c,
        mPts: m,
        cPts: c,
        first,
        total: 10,
        acc: Math.round((first / 5) * 100),
        timeSec: time + 150,
        jodi: ago % 2 === 1,
      }));
      return { ...prev, [mobile]: u };
    });
    setSession(mobile);
  }, []);

  const addPlay = useCallback(
    (play) => updateUser((u) => ({ ...u, plays: pruneAnswers([...u.plays, play]) })),
    [updateUser],
  );

  const recordSpin = useCallback(
    (idx) => updateUser((u) => ({ ...u, spins: { ...u.spins, [todayKey()]: idx } })),
    [updateUser],
  );

  const value = useMemo(
    () => ({ db, user, isTeacher, login, logout, register, restore, openDemo, addPlay, recordSpin, lastQuiz, setLastQuiz }),
    [db, user, isTeacher, login, logout, register, restore, openDemo, addPlay, recordSpin, lastQuiz],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
