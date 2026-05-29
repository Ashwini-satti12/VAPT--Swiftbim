import axios from 'axios';

/**
 * API base URL:
 * - Set `VITE_API_URL` in `.env` when the UI must call a remote API (staging/production).
 * - In local dev, leave `VITE_API_URL` unset so requests stay on the Vite origin (`/api/...`)
 *   and `vite.config.ts` proxies to Flask — works the same on every laptop (no hard-coded :5000 in the browser).
 */
/** Exported for asset URLs (`/uploads`, profile images) — same rules as Axios `baseURL`. */
// local development
// export const appApiBase =
//   import.meta.env.VITE_API_URL ||
//   import.meta.env.VITE_API_BASE_URL ||
//   (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000/');

// // remote development
export const appApiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'https://projectmanagement.swifterz.ae/');

const baseURL = appApiBase;

/** JWT `exp` claim as milliseconds since epoch (for 15-minute session timeout). */
export function getJwtExpiryMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const TOKEN_EXPIRES_AT_KEY = 'token_expires_at';

/** Password-reset / forgot flows — never attach Bearer. */
const PUBLIC_AUTH_PATHS = [
  '/api/auth/forgot-password',
  '/api/auth/resend-otp',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
];

export function isPublicAuthPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((p) => url.includes(p));
}

/** Skip Bearer on credential POST (step 1); step 2 login confirm sends Authorization. */
export const SKIP_AUTH_HEADER = 'X-Skip-Auth';

export function setTokenExpiry(expiresAt?: string | null): void {
  if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
  else localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

/** Session end time in ms — from JWT `exp`, with `expires_at` from login as fallback. */
export function getSessionExpiryMs(token: string | null): number | null {
  if (token) {
    const fromJwt = getJwtExpiryMs(token);
    if (fromJwt) return fromJwt;
  }
  const raw = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function clearAuthStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userProfilePicture');
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

export function redirectToLogin(): void {
  let path = '/login';
  try {
    const raw = localStorage.getItem('user');
    if (raw && JSON.parse(raw)?.user_type === 'client') {
      path = '/client-login';
    }
  } catch {
    /* ignore */
  }
  if (!window.location.pathname.startsWith(path)) {
    window.location.href = path;
  }
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const headers = config.headers ?? {};
  const skipAuth =
    headers[SKIP_AUTH_HEADER] === '1' || headers[SKIP_AUTH_HEADER] === true;

  if (skipAuth || isPublicAuthPath(url)) {
    delete headers[SKIP_AUTH_HEADER];
    delete headers.Authorization;
    config.headers = headers;
    return config;
  }

  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      const isLoginRequest =
        isPublicAuthPath(url) ||
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/client-login');
      const isLogoutRequest =
        url.includes('/api/auth/logout') || url.includes('/api/auth/client-logout');
      // Don't redirect on failed login/logout — login page shows errors; logout clears locally
      if (!isLoginRequest && !isLogoutRequest) {
        clearAuthStorage();
        redirectToLogin();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
