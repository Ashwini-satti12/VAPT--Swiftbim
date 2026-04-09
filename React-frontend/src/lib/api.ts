import axios from 'axios';

const baseURL =
  // import.meta.env.VITE_API_URL || "http://localhost:5000/";  
  import.meta.env.VITE_API_URL || "https://projectmanagement.swifterz.ae/";
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
