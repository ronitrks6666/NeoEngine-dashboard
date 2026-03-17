import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('neoengine_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for login/auth requests - let the caller handle it
    const isAuthRequest = error.config?.url?.includes('/login') ||
      error.config?.url?.includes('/send-otp') ||
      error.config?.url?.includes('/verify-otp');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('neoengine_token');
      localStorage.removeItem('neoengine_user');
      localStorage.removeItem('neoengine_role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
