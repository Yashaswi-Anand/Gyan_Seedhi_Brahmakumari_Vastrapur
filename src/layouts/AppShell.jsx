import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import BottomNav from '@/components/common/BottomNav';
import { useApp } from '@/context/AppContext';

/**
 * Wraps every signed-in screen: redirects to login when nobody is signed in,
 * and shows the bottom navigation when `withNav` is set.
 */
export default function AppShell({ withNav = false }) {
  const { user } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className={`app${withNav ? '' : ' nonav'}`}>
      <Outlet />
      {withNav && <BottomNav />}
    </div>
  );
}
