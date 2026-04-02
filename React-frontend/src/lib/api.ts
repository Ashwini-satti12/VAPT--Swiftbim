import axios, { AxiosHeaders } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/";
// import.meta.env.VITE_API_URL || "https://projectmanagement.swifterz.ae/";
export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const headers = AxiosHeaders.from(config.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Default JSON Content-Type makes axios stringify FormData — must omit so the browser sets multipart boundary
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    headers.delete("Content-Type");
  }
  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest =
        err.config?.url?.includes("/api/auth/login") ||
        err.config?.url?.includes("/api/auth/client-login");
      // Don't redirect on failed login — let the login page show the error message
      if (!isLoginRequest) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
