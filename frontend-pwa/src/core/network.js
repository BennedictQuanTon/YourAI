import axios from 'axios';

// API endpoints base config
const API_BASE_URL = 'http://localhost:8000/api/v1';

const network = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for HttpOnly Cookies parsing
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to dynamically inject the JWT bearer token from localStorage
network.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('yourai_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization expiration gracefully
network.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[NETWORK] Unauthorized request or expired session. Wiping token...');
      localStorage.removeItem('yourai_token');
      // Trigger a custom event so App.jsx can respond and transition to login state
      window.dispatchEvent(new Event('yourai_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default network;
export { API_BASE_URL };
