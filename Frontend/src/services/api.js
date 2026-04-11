import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOCAL_API_CANDIDATES = ['http://localhost:5000/api', 'http://localhost:5001/api'];

const getLocalFallbackBaseUrl = (currentBaseUrl = '', tried = []) => {
  const normalizedCurrent = String(currentBaseUrl || '').toLowerCase();
  const triedSet = new Set((Array.isArray(tried) ? tried : []).map((value) => String(value).toLowerCase()));

  return LOCAL_API_CANDIDATES.find((candidate) => {
    const normalizedCandidate = String(candidate).toLowerCase();
    if (normalizedCurrent === normalizedCandidate) return false;
    return !triedSet.has(normalizedCandidate);
  }) || null;
};

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
    const isNetworkRefused = !error.response && (error.code === 'ERR_NETWORK' || String(error.message || '').includes('Network Error'));
    const currentBaseUrl = requestConfig.baseURL || api.defaults.baseURL || '';
    const localFallbackBaseUrl = getLocalFallbackBaseUrl(currentBaseUrl, requestConfig.__triedLocalFallbackBaseUrls);
    const canTryLocalFallback = isNetworkRefused && Boolean(localFallbackBaseUrl);

    if (canTryLocalFallback) {
      const triedBaseUrls = Array.isArray(requestConfig.__triedLocalFallbackBaseUrls)
        ? requestConfig.__triedLocalFallbackBaseUrls
        : [];

      requestConfig.__triedLocalFallbackBaseUrls = [...triedBaseUrls, localFallbackBaseUrl];
      requestConfig.baseURL = localFallbackBaseUrl;
      api.defaults.baseURL = localFallbackBaseUrl;
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
