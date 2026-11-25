import axios from 'axios';

// In development with Vite proxy, baseURL can default to '' or import.meta.env.VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token when available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clinic_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If session expired or unauthorized, notify or clear
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('clinic_auth_token');
      localStorage.removeItem('clinic_auth_user');
    }
    return Promise.reject(error);
  }
);

export default api;

