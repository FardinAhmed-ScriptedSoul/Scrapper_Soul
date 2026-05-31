import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import TerminalPanel from './TerminalPanel';

export default function Login({ onNavigate }) {
  const { login, verifyOTP, isOtpPending, pendingEmail, setIsOtpPending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);

    try {
      if (!isOtpPending) {
        // Phase 1: Submit Credentials
        const result = await login(email, password);
        if (result?.otpRequired) {
          // System successfully transitioned to OTP verification state
          setOtpCode('');
        }
      } else {
        // Phase 2: Submit 6-Digit Verification Token
        await verifyOTP(otpCode);
        // Successful verification automatically changes App view state through context
      }
    } catch (err) {
      setLocalError(err || 'Access Denied: Mainframe rejected authorization sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOtp = () => {
    setIsOtpPending(false);
    setOtpCode('');
    setLocalError(null);
  };

  const handleToggleView = () => {
    setLocalError(null);
    onNavigate();
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0b141c] text-[#dae3ee] font-sans">
      
      {/* Left Column: Automated Telemetry Screen Text Panel */}
      <TerminalPanel />

      {/* Right Column: Centered Access Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12 select-none overflow-y-auto">
        
        {/* Top Brand Branding Block */}
        <div className="flex flex-col items-center mb-6 md:mb-8 text-center w-full max-w-sm sm:max-w-md">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-3 shadow-md radiant-glow">
            <span className="material-symbols-outlined text-blue-400 text-2xl">terminal</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">Scrapper-Soul</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Enterprise Web Intelligence Portal</p>
        </div>

        {/* Main Glass-Panel Form Container */}
        <div className="w-full max-w-sm sm:max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:border-slate-600">
          <div className="mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-white tracking-wide">
              {isOtpPending ? 'Security Verification' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isOtpPending 
                ? `Enter the 6-digit access token transmitted to ${pendingEmail}` 
                : 'Access your extraction infrastructure.'}
            </p>
          </div>

          {/* Dynamic Telemetry Fault Alerts Panel */}
          {localError && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs font-mono text-rose-400 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">gpp_maybe</span>
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px]">Security Fault Detected</p>
                <p className="opacity-90 mt-0.5">{localError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {!isOtpPending ? (
              <>
                {/* Email Input Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      alternate_email
                    </span>
                    <input
                      type="email"
                      value={email}
                      disabled={isSubmitting}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@enterprise.com"
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                {/* Password Input Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                      Password
                    </label>
                    <a href="#forgot" className="text-xs font-medium text-blue-400 hover:underline transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      lock
                    </span>
                    <input
                      type="password"
                      value={password}
                      disabled={isSubmitting}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              /* OTP Code Input Field */
              <div className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Verification Code
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    pin
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    disabled={isSubmitting}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-center text-lg font-mono tracking-[0.5em] text-blue-400 placeholder-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#a3bffa] hover:bg-[#b0cbff] text-[#0b141c] font-semibold text-sm py-2.5 md:py-3 rounded-xl cursor-pointer shadow-md transition-all radiant-button-glow mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0b141c] border-t-transparent rounded-full animate-spin"></div>
                  <span>{isOtpPending ? 'Authorizing Code...' : 'Verifying Operations...'}</span>
                </>
              ) : (
                <span>{isOtpPending ? 'Verify Identity Token' : 'Sign In to Dashboard'}</span>
              )}
            </button>

            {isOtpPending && (
              <button
                type="button"
                onClick={handleCancelOtp}
                disabled={isSubmitting}
                className="w-full bg-transparent text-slate-500 hover:text-slate-400 font-medium text-xs text-center pt-1 block underline transition-colors"
              >
                Return to Login Credentials
              </button>
            )}
          </form>

          {/* Footer Link Options */}
          {!isOtpPending && (
            <div className="text-center mt-6">
              <p className="text-xs text-slate-400">
                New operator?{' '}
                <button 
                  onClick={handleToggleView}
                  disabled={isSubmitting}
                  className="text-blue-400 font-semibold hover:underline ml-1 cursor-pointer bg-transparent border-none outline-none disabled:opacity-50"
                >
                  Create account
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Micro System Telemetry Status Footer */}
        <div className="mt-6 md:mt-8 flex items-center space-x-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
            <span>Mainframe: Online</span>
          </div>
          <span className="text-slate-700">|</span>
          <span>v2.4.0-Stable</span>
        </div>

      </div>
    </div>
  );
}