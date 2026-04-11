import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOCAL_FALLBACK_API_URLS = [
  'http://localhost:5000/api',
  'http://localhost:5001/api',
];

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
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
    const isNetworkFailure = !error.response && (
      error.code === 'ERR_NETWORK'
      || error.code === 'ECONNRESET'
      || String(error.message || '').includes('Network Error')
      || String(error.message || '').includes('ERR_CONNECTION_RESET')
    );
    const currentBaseUrl = requestConfig.baseURL || api.defaults.baseURL || '';

    if (isNetworkFailure) {
      const tried = Array.isArray(requestConfig.__triedBaseUrls)
        ? requestConfig.__triedBaseUrls
        : [];

      const fallbackTargets = LOCAL_FALLBACK_API_URLS.filter((url) => !tried.includes(url));

      // Only auto-failover for localhost development targets.
      if (String(currentBaseUrl).includes('localhost') && fallbackTargets.length) {
        const nextBaseUrl = fallbackTargets[0];
        requestConfig.__triedBaseUrls = [...tried, nextBaseUrl];
        requestConfig.baseURL = nextBaseUrl;
        api.defaults.baseURL = nextBaseUrl;
        return api(requestConfig);
      }
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
