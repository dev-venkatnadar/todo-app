import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const { token, user, loading } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);
  useEffect(() => {
    if (loading) return;
    const destination = token && user ? '/' : '/login';
    if ((destination === '/login' && path !== '/login') || (destination === '/' && path === '/login')) {
      window.history.replaceState({}, '', destination);
      setPath(destination);
    }
  }, [loading, token, user, path]);
  if (loading) return <div className="app-loading"><span className="loader" />Checking your session…</div>;
  return token && user ? <DashboardPage /> : <LoginPage />;
}
