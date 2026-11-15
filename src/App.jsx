import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { QuestionsProvider } from '@/context/QuestionsContext';
import AppShell from '@/layouts/AppShell';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import QuestionsAdminPage from '@/pages/QuestionsAdminPage';
import QuizPage from '@/pages/QuizPage';
import RankPage from '@/pages/RankPage';
import ResultPage from '@/pages/ResultPage';
import WheelPage from '@/pages/WheelPage';

function LoginRoute() {
  const { user } = useApp();
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="app login-shell">
      <LoginPage />
    </div>
  );
}

/** Teacher-only screens; anyone else is sent home. */
function TeacherOnly({ children }) {
  const { isTeacher } = useApp();
  return isTeacher ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <QuestionsProvider>
          {/* HashRouter so the build works on any static host without server rewrites */}
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<AppShell withNav />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/rank" element={<RankPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route
                  path="/questions"
                  element={
                    <TeacherOnly>
                      <QuestionsAdminPage />
                    </TeacherOnly>
                  }
                />
              </Route>
              <Route element={<AppShell />}>
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="/result" element={<ResultPage />} />
                <Route path="/wheel" element={<WheelPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </QuestionsProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
