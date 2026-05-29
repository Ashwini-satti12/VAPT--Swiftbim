import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthState, User } from '../types';
import api, {
  clearAuthStorage,
  getSessionExpiryMs,
  redirectToLogin,
  setTokenExpiry,
  SKIP_AUTH_HEADER,
} from '../lib/api';

type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  expires_at?: string;
  user?: User;
};

function tokenFromLoginResponse(
  data: LoginResponse,
  headers: Record<string, unknown> | undefined
): string | undefined {
  if (data.token) return data.token;
  const raw = headers?.authorization ?? headers?.Authorization;
  if (typeof raw !== 'string') return undefined;
  return raw.replace(/^Bearer\s+/i, '').trim() || undefined;
}

/** Step 2: POST login with Authorization Bearer (visible in Network like project APIs). */
async function confirmLoginWithBearer(loginPath: string) {
  await api.post<LoginResponse>(loginPath, {});
}

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
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() => localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((t: string | null, expiresAt?: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem('token', t);
      setTokenExpiry(expiresAt);
    } else {
      localStorage.removeItem('token');
      setTokenExpiry(null);
    }
  }, []);

  const expireSession = useCallback(() => {
    setTokenState(null);
    setUser(null);
    clearAuthStorage();
    redirectToLogin();
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
      const expMs = getSessionExpiryMs(token);
      if (expMs && expMs <= Date.now()) {
        expireSession();
        return;
      }
      setLoading(true);
      fetchMe();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token, fetchMe, expireSession]);

  /** Auto-logout when JWT expires (default 15 minutes after login). */
  useEffect(() => {
    if (!token) return;
    const expMs = getSessionExpiryMs(token);
    if (!expMs) return;
    const remaining = expMs - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    const timerId = window.setTimeout(() => expireSession(), remaining);
    return () => window.clearTimeout(timerId);
  }, [token, expireSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.post<LoginResponse>(
          '/api/auth/login',
          { email, password },
          { headers: { [SKIP_AUTH_HEADER]: '1' } }
        );
        const { data } = res;
        const jwt = tokenFromLoginResponse(data, res.headers as Record<string, unknown>);
        if (data.success && jwt && data.user) {
          const u = { ...data.user, user_type: data.user.user_type || 'employee' };
          setToken(jwt, data.expires_at);
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          try {
            await confirmLoginWithBearer('/api/auth/login');
          } catch {
            /* Session is already valid from step 1; bearer confirm is optional. */
          }
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
        const res = await api.post<LoginResponse>(
          '/api/auth/client-login',
          { email, password },
          { headers: { [SKIP_AUTH_HEADER]: '1' } }
        );
        const { data } = res;
        const jwt = tokenFromLoginResponse(data, res.headers as Record<string, unknown>);
        if (data.success && jwt && data.user) {
          const u = { ...data.user, user_type: 'client' as const };
          setToken(jwt, data.expires_at);
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          try {
            await confirmLoginWithBearer('/api/auth/client-login');
          } catch {
            /* Session is already valid from step 1; bearer confirm is optional. */
          }
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
    const logoutPath =
      user?.user_type === 'client' ? '/api/auth/client-logout' : '/api/auth/logout';
    try {
      await api.post(logoutPath);
    } catch {
      /* ignore — local session is cleared below */
    }
    setToken(null);
    setRefreshTokenState(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
    clearAuthStorage();
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
