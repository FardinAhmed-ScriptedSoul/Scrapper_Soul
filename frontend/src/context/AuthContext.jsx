// src/context/AuthContext.jsx
import { useState, useEffect } from 'react';
import { authApi } from '../api/authApi.js';
import { AuthContext } from './authContext.js';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // 🚀 Authenticates session status instantly on refresh
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await authApi.getMe();
        
        // Handle Axios wrapper strip vs raw payloads
        const userData = response?.data || response;
        
        if (userData && (userData.id || userData._id || userData.username)) {
          setUser({
            _id: userData._id || userData.id,
            username: userData.username,
            email: userData.email,
            ...userData
          });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch {
        console.log("ℹ =] Active session validation check failed on browser initialization.");
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      if (response.status === 'pending_verification' || response.status === 'success') {
        setPendingEmail(email);
        setIsOtpPending(true);
        return { otpRequired: true, message: response.message };
      }
      return { otpRequired: false };
    } catch (error) {
      setIsOtpPending(false);
      throw error.message || "Credentials processing error.";
    }
  };

  // 🚀 Pass explicit email and otp straight into parameters to ensure zero state desyncs
  // Ensure your verifyOTP function in AuthContext.jsx looks exactly like this:
const verifyOTP = async (email, otp) => {
  try {
    const response = await authApi.verifyLoginOTP(email, otp);
    const userData = response?.data?.user || response?.user || response?.data;
    
    if (userData) {
      setUser({
        _id: userData._id || userData.id,
        username: userData.username,
        email: userData.email,
        ...userData
      });
      setIsAuthenticated(true);
      setIsOtpPending(false);
      setPendingEmail('');
      return userData;
    }
  } catch (error) {
    throw error.message || "Invalid validation code.";
  }
};

  const registerVerifySync = (userData) => {
    if (userData) {
      setUser({
        _id: userData._id || userData.id,
        username: userData.username,
        email: userData.email,
        ...userData
      });
      setIsAuthenticated(true);
      setIsOtpPending(false);
      setPendingEmail('');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("⚠️ Logout error:", error.message);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsOtpPending(false);
      setPendingEmail('');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      isOtpPending,
      pendingEmail,
      login,
      verifyOTP,
      registerVerifySync,
      logout,
      setIsOtpPending
    }}>
      {children}
    </AuthContext.Provider>
  );
};
