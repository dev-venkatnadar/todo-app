import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('daymark_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    localStorage.removeItem('daymark_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    apiRequest('/user', { token })
      .then((response) => {
        if (active) setUser(response?.user || response);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token, clearSession]);

  const signIn = async (credentials, mode = 'login') => {
    const response = await apiRequest(`/${mode === 'register' ? 'register' : 'login'}`, {
      method: 'POST',
      body: JSON.stringify({ ...credentials, device_name: 'daymark-web' }),
    });
    const nextToken = response?.token || response?.access_token;
    if (!nextToken) throw new Error('The API response did not include an access token.');
    localStorage.setItem('daymark_token', nextToken);
    setToken(nextToken);
    setUser(response.user || null);
  };

  const signOut = async () => {
    try { await apiRequest('/logout', { method: 'POST', token }); } catch { /* Local sign-out still succeeds. */ }
    clearSession();
  };

  const value = useMemo(() => ({ token, user, loading, signIn, signOut }), [token, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
