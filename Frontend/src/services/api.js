import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOCAL_FALLBACK_API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config || {};
    const isNetworkRefused = !error.response && (error.code === 'ERR_NETWORK' || String(error.message || '').includes('Network Error'));
    const currentBaseUrl = requestConfig.baseURL || api.defaults.baseURL || '';
    const canTryLocalFallback =
      isNetworkRefused
      && !requestConfig.__triedLocalFallback
      && String(currentBaseUrl).includes('localhost:5000');

    if (canTryLocalFallback) {
      requestConfig.__triedLocalFallback = true;
      requestConfig.baseURL = LOCAL_FALLBACK_API_URL;
      api.defaults.baseURL = LOCAL_FALLBACK_API_URL;
      return api(requestConfig);
    }

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
