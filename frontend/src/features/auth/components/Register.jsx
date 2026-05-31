import React, { useState } from 'react';
import api from '../../../api/api'; 
import { useAuth } from '../../../context/AuthContext'; // Import useAuth context hook
import TerminalPanel from './TerminalPanel';

export default function Register() {
  const { registerVerifySync } = useAuth(); // Consume the instant login synchronization hook
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);

    try {
      if (!isOtpPending) {
        // Phase 1: Request account activation OTP code code dispatch
        const response = await authApi.registerRequest(formData.name, formData.email, formData.password);
        if (response.status === 'success' || response.message?.includes('OTP')) {
          setIsOtpPending(true);
        }
      } else {
        // Phase 2: Verify registration OTP
        const response = await authApi.registerVerify(formData.email, otpCode);
        
        // Match the backend controller structure: data: { user: { id, username, email } }
        const targetUser = response?.data?.user || response?.user;
        
        if (targetUser) {
          // Sync state instantly. Pushes routing rules straight into Dashboard view.
          registerVerifySync(targetUser);
        } else {
          setLocalError("Account provisioning finished but data syncing failed. Please try logging in.");
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Initialization Failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0b141c] text-[#dae3ee] font-sans">
      
      {/* Left Column: Automated Telemetry Screen Text Panel */}
      <TerminalPanel />

      {/* Right Column: Centered Register Form Panel */}
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
              {isOtpPending ? 'Verify Account Provision' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isOtpPending 
                ? `Enter verification node code transmitted to ${formData.email}` 
                : 'Join the extraction network.'}
            </p>
          </div>

          {/* Dynamic Registration Fault Alerts Panel */}
          {localError && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs font-mono text-rose-400 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">gpp_maybe</span>
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px]">Handshake Interrupted</p>
                <p className="opacity-90 mt-0.5">{localError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {!isOtpPending ? (
              <>
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">Display Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      person
                    </span>
                    <input
                      type="text"
                      placeholder="Operator Name"
                      required
                      disabled={isSubmitting}
                      value={formData.name}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      alternate_email
                    </span>
                    <input
                      type="email"
                      placeholder="name@enterprise.com"
                      required
                      disabled={isSubmitting}
                      value={formData.email}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      lock
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
                      value={formData.password}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* OTP Field for Registration Verification */
              <div className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Activation Key Token
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    vpn_key
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    disabled={isSubmitting}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2.5 md:py-3 pl-10 pr-4 text-center text-lg font-mono tracking-[0.5em] text-emerald-400 placeholder-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#a3bffa] hover:bg-[#b0cbff] text-[#0b141c] font-semibold text-sm py-2.5 md:py-3 rounded-xl transition-all radiant-button-glow mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0b141c] border-t-transparent rounded-full animate-spin"></div>
                  <span>Provisioning Node...</span>
                </>
              ) : (
                <span>{isOtpPending ? 'Activate Core Node' : 'Initialize Access'}</span>
              )}
            </button>
          </form>

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