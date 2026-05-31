import axios from 'axios';

// Pull backend endpoint base target from environment variables, defaulting to local port
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Crucial: Automatically attaches HTTP-only cookies across handshakes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to format clean data objects and catch transmission failures safely
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const fallbackMessage = error.response?.data?.message || 'A network communication error occurred.';
    return Promise.reject({
      message: fallbackMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default api;