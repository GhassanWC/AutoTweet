/**
 * API Service
 * Axios instance configured for API requests with JWT auth
 */

import axios from 'axios';

// Token storage keys
const TOKEN_KEY = 'autotweet_token';

// Token management
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data;
      // Extract message: prefer single error string, then first validation error, then fallback
      const message =
        data?.error ||
        data?.detail ||
        (Array.isArray(data?.errors) && data.errors.length > 0
          ? data.errors.map(e => e.msg || e.message).join('; ')
          : null) ||
        'An error occurred';
      error.message = message;

      // Handle 401 by clearing token
      if (error.response.status === 401) {
        removeToken();
        // Only auto-redirect for auth-check endpoints, not action endpoints
        // This lets the caller display the error message (e.g., "Twitter auth expired")
        const isAuthCheck = error.config?.url?.includes('/api/auth/');
        if (isAuthCheck && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    } else if (error.request) {
      // Request made but no response
      error.message = 'Network error - please check your connection';
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const authAPI = {
  getMe: () => api.get('/api/auth/me'),
  initiateLogin: () => api.get('/api/auth/twitter'),
  logout: () => {
    removeToken();
    return api.post('/api/auth/logout');
  },
  getStatus: () => api.get('/api/auth/status'),
};

export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateSettings: (settings) => api.put('/api/user/settings', settings),
  getDashboard: () => api.get('/api/user/dashboard'),
  getEngagement: (params) => api.get('/api/user/engagement', { params }),
  deleteAccount: () => api.delete('/api/user'),
};

export const tweetAPI = {
  schedule: (data) => api.post('/api/tweets', data),
  scheduleThread: (tweets) => api.post('/api/tweets/thread', { tweets }),
  getAll: (params) => api.get('/api/tweets', { params }),
  getPending: () => api.get('/api/tweets/pending'),
  getOne: (id) => api.get(`/api/tweets/${id}`),
  update: (id, data) => api.put(`/api/tweets/${id}`, data),
  cancel: (id) => api.patch(`/api/tweets/${id}/cancel`),
  sendNow: (id) => api.post(`/api/tweets/${id}/send`),
  delete: (id) => api.delete(`/api/tweets/${id}`),
  getStats: () => api.get('/api/tweets/stats'),
};

export const ruleAPI = {
  create: (data) => api.post('/api/rules', data),
  getAll: () => api.get('/api/rules'),
  getOne: (id) => api.get(`/api/rules/${id}`),
  update: (id, data) => api.put(`/api/rules/${id}`, data),
  toggle: (id) => api.patch(`/api/rules/${id}/toggle`),
  delete: (id) => api.delete(`/api/rules/${id}`),
};

export const brandVoiceAPI = {
  get: () => api.get('/api/brand-voice'),
  save: (data) => api.post('/api/brand-voice', data),
};

export const pillarAPI = {
  getAll: () => api.get('/api/pillars'),
  create: (data) => api.post('/api/pillars', data),
  update: (id, data) => api.put(`/api/pillars/${id}`, data),
  delete: (id) => api.delete(`/api/pillars/${id}`),
};

export const aiAPI = {
  getStatus: () => api.get('/api/ai/status'),
  generatePost: (data) => api.post('/api/ai/generate', data),
  generateVariations: (data) => api.post('/api/ai/variations', data),
  generateThread: (data) => api.post('/api/ai/thread', data),
  generateIdeas: (data) => api.post('/api/ai/ideas', data),
  generatePrompt: (data) => api.post('/api/ai/generate-prompt', data),
  generateImage: (data) => api.post('/api/ai/generate-image', data),
};

export const apiKeysAPI = {
  get: () => api.get('/api/api-keys'),
  save: (data) => api.post('/api/api-keys', data),
  deleteKey: (field) => api.delete(`/api/api-keys/${field}`),
  testTwitter: () => api.post('/api/api-keys/test-twitter'),
};

