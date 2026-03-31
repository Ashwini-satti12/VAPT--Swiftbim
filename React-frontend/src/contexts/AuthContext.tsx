import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthState, User } from '../types';
import api from '../lib/api';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  }, []);

  const fetchMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ success: boolean; user?: User }>('/api/auth/me');
      if (data.success && data.user) {
        const u = { ...data.user, user_type: data.user.user_type || 'employee' };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      } else {
        setUser(null);
        setToken(null);
      }
    } catch {
      try {
        const { data } = await api.get<{ success: boolean; user?: User }>('/api/client/me');
        if (data.success && data.user) {
          const u = { ...data.user, user_type: 'client' as const };
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        } else {
          setUser(null);
          setToken(null);
        }
      } catch {
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token, setToken]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchMe();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post<{
          success: boolean;
          message?: string;
          token?: string;
          user?: User;
        }>('/api/auth/login', { email, password });
        if (data.success && data.token && data.user) {
          const u = { ...data.user, user_type: data.user.user_type || 'employee' };
          setToken(data.token);
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          return { success: true, user: u };
        }
        return { success: false, message: data.message || 'Login failed' };
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Login failed';
        return { success: false, message: msg };
      }
    },
    [setToken]
  );

  const clientLogin = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post<{
          success: boolean;
          message?: string;
          token?: string;
          user?: User;
        }>('/api/auth/client-login', { email, password });
        if (data.success && data.token && data.user) {
          const u = { ...data.user, user_type: 'client' as const };
          setToken(data.token);
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          return { success: true };
        }
        return { success: false, message: data.message || 'Login failed' };
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Login failed';
        return { success: false, message: msg };
      }
    },
    [setToken]
  );

  const logout = useCallback(async () => {
    if (user?.user_type !== 'client') {
      try {
        await api.post('/api/auth/logout');
      } catch {
        /* ignore */
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfilePicture');
  }, [setToken, user?.user_type]);

  const value: AuthState = {
    user,
    token,
    loading,
    setUser,
    setToken,
    login,
    clientLogin,
    logout,
    fetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
