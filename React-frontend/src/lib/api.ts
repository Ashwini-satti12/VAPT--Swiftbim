import axios from 'axios';

/**
 * API base URL:
 * - Set `VITE_API_URL` in `.env` when the UI must call a remote API (staging/production).
 * - In local dev, leave `VITE_API_URL` unset so requests stay on the Vite origin (`/api/...`)
 *   and `vite.config.ts` proxies to Flask — works the same on every laptop (no hard-coded :5000 in the browser).
 */
/** Exported for asset URLs (`/uploads`, profile images) — same rules as Axios `baseURL`. */
// local development
export const appApiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000/');

// // remote development
// export const appApiBase =
//   import.meta.env.VITE_API_URL ||
//   import.meta.env.VITE_API_BASE_URL ||
//   (import.meta.env.DEV ? '' : 'https://projectmanagement.swifterz.ae/');

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

export function clearAuthStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userProfilePicture');
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
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest =
        err.config?.url?.includes('/api/auth/login') ||
        err.config?.url?.includes('/api/auth/client-login');
      // Don't redirect on failed login — let the login page show the error message
      if (!isLoginRequest) {
        clearAuthStorage();
        redirectToLogin();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
