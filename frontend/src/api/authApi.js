// src/api/authApi.js
import api from './api.js'; // ⚡ Import your centralized, pre-configured axios instance wrapper

export const authApi = {
  /**
   * 🔑 Phase 1 Login: Submits user credentials to trigger email OTP dispatch
   */
  login: async (email, password) => {
    // Note: Since your response interceptor already strips away the redundant Axios wrapper and returns 'response.data',
    // we can return the promise resolve context directly without appending '.data' again!
    return await api.post('/auth/login', { email, password });
  },

  /**
   * 🔢 Phase 2 Login: Submits the 6-digit email verification code to establish the secure session
   */
  verifyLoginOTP: async (email, otp) => {
    return await api.post('/auth/login-verify', { email, otp });
  },

  /**
   * 👤 Session Synchronization: Fetches current authenticated profile context on page initialization
   */
  getMe: async () => {
    return await api.get('/auth/get-me');
  },

  /**
   * 🚪 Terminate Session: Clears local session caches and invalidates cookie arrays
   */
  logout: async () => {
    return await api.post('/auth/logout');
  },

  // --- Dynamic Dashboard Data Hooks ---
  getTelemetry: async () => {
    return await api.get('/dashboard/telemetry');
  },

  getTasks: async () => {
    return await api.get('/dashboard/tasks');
  },

  getProxies: async () => {
    return await api.get('/dashboard/proxies');
  },

  updateSettings: async (settingsData) => {
    return await api.put('/dashboard/settings', settingsData);
  }
};

export default authApi;