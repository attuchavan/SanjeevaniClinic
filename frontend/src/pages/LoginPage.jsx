import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ArrowRight
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(username, password);

      // Navigate to intended destination or default role dashboard
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'DOCTOR') {
          navigate('/doctor', { replace: true });
        } else {
          navigate('/receptionist', { replace: true });
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role) => {
    setErrorMessage('');
    if (role === 'doctor') {
      setUsername('doctor');
      setPassword('doctor123');
    } else {
      setUsername('receptionist');
      setPassword('reception123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Clinic Identification Header */}
      <div className="bg-[#102a43] text-white py-3 px-6 shadow-md border-b border-navy-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500/20 p-2 rounded-lg border border-sky-400/30 text-sky-300">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide">SANJEEVANI CLINIC</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-sky-200/80">
                • Dr. Sharad Motugade (Physician & Consultant)
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-sky-200/90 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/40">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Offline LAN Secure</span>
          </div>
        </div>
      </div>

      {/* Main Login Card Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Card Title Banner */}
          <div className="p-8 pb-6 border-b border-slate-100 text-center">
            <div className="w-14 h-14 bg-sky-50 text-[#102a43] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-sm">
              <Stethoscope className="w-7 h-7 text-sky-600" />
            </div>
            <h1 className="text-xl font-bold text-[#102a43]">
              SANJEEVANI CLINIC
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Dr. Sharad Motugade Clinic Management System
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select authorized role to sign in
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="p-8 pt-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username / User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. doctor or receptionist"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#102a43] hover:bg-[#1d3557] text-white text-sm font-semibold rounded-xl shadow-md shadow-navy-900/10 transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Credentials Helper for Local Clinic Testing */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Quick Fill Role Credentials
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('doctor')}
                  className="p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 rounded-xl text-left transition-colors"
                >
                  <span className="block text-xs font-bold text-sky-900">Dr. Sharad Motugade</span>
                  <span className="block text-[10px] text-sky-700 font-mono mt-0.5">doctor / doctor123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('receptionist')}
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl text-left transition-colors"
                >
                  <span className="block text-xs font-bold text-indigo-900">Reception Desk</span>
                  <span className="block text-[10px] text-indigo-700 font-mono mt-0.5">receptionist / reception123</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        SANJEEVANI CLINIC &bull; Dr. Sharad Motugade &bull; Offline Local Database &bull; Port 5000
      </footer>
    </div>
  );
}
