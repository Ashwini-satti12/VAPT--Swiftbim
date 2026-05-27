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
      const isLoginRequest =
        originalRequest?.url?.includes('/api/auth/login') ||
        originalRequest?.url?.includes('/api/auth/client-login') ||
        originalRequest?.url?.includes('/api/auth/refresh');

      if (!isLoginRequest && !originalRequest._retry) {
        if (isRefreshing) {
          try {
            const token = await new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            // Need to make sure baseURL ends properly for the refresh endpoint
            const refreshUrl = baseURL.endsWith('/') ? `${baseURL}api/auth/refresh` : `${baseURL}/api/auth/refresh`;
            const { data } = await axios.post<{ success: boolean; token: string }>(
              refreshUrl,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            if (data.success && data.token) {
              localStorage.setItem('token', data.token);
              api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
              originalRequest.headers.Authorization = `Bearer ${data.token}`;
              processQueue(null, data.token);
              return api(originalRequest);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
          } finally {
            isRefreshing = false;
          }
        } else {
          isRefreshing = false;
        }

        // If refresh failed or there was no refresh token
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
