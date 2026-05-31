// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await authApi.getMe();
        if (response && response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log("ℹ️ No active secure session cookie discovered on initialization.");
      } finally {
        setIsLoading(false);
      }
    };
    initializeSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);

      // ✅ Fix 1: Match actual backend status "pending_verification" (not "success")
      if (response.status === 'pending_verification' || response.status === 'success') {
        setPendingEmail(email);
        setIsOtpPending(true);
        return { otpRequired: true, message: response.message };
      }
      return { otpRequired: false };
    } catch (error) {
      setIsOtpPending(false);
      throw error.message || "Credentials verification processing fault.";
    }
  };

  const verifyOTP = async (otp) => {
    try {
      const response = await authApi.verifyLoginOTP(pendingEmail, otp);

      // ✅ Fix 2: Backend nests user under response.data.user, not response.user
      const userData = response.data?.user || response.user;
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        setIsOtpPending(false);
        setPendingEmail('');
        return userData;
      }
    } catch (error) {
      throw error.message || "Invalid or expired verification code entered.";
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("⚠️ Server-side cookie clear reported anomalies:", error.message);
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
      logout,
      setIsOtpPending
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be nested within an explicitly declared AuthProvider engine loop.');
  }
  return context;
};