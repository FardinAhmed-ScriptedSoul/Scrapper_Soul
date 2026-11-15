// src/api/authApi.js
import api from './api.js'; // Import your centralized, pre-configured axios instance wrapper

export const authApi = {
  /**
   * 📝 Phase 1 Registration: Requests an account creation OTP
   */
  registerRequest: async (username, email, password) => {
    return await api.post('/auth/register-request', { userName: username, email, password });
  },

  /**
   * 🛡️ Phase 2 Registration: Submits 6-digit verification code to establish the user account
   */
  registerVerify: async (email, otp) => {
    return await api.post('/auth/register-verify', { email, otp });
  },

  /**
   * 🔑 Phase 1 Login: Submits user credentials to trigger email OTP dispatch
   */
  login: async (email, password) => {
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
   * Adjusted to match standard backend API routing patterns ('/auth/me')
   */
  getMe: async () => {
    return await api.get('/auth/get-me'); 
  },

  /**
   * 🚪 Terminate Session: Clears local session caches and invalidates cookie arrays
   */
  logout: async () => {
    return await api.post('/auth/logout');
  }
};

export default authApi;