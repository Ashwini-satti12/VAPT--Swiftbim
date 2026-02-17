import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import SwifterzLogo from '../assets/SwifterzLogo.png';

type Step = 'login' | 'forgot' | 'otp' | 'reset';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [logoError, setLogoError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) navigate(from, { replace: true });
    else setError(result.message || 'Login failed');
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>('/api/auth/forgot-password', { email });
      if (data.success) {
        setStep('otp');
        setMessage('Enter the OTP sent to your email.');
      } else setError(data.message || 'Failed');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send OTP');
    }
    setSubmitting(false);
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ success: boolean; reset_token?: string }>('/api/auth/verify-otp', { email, otp });
      if (data.success && data.reset_token) {
        setResetToken(data.reset_token);
        setStep('reset');
        setMessage('Set your new password.');
      } else setError('Invalid OTP.');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid OTP');
    }
    setSubmitting(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password1 !== password2) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>('/api/auth/reset-password', {
        reset_token: resetToken,
        password1,
        password2,
      });
      if (data.success) {
        setMessage('Password updated. You can now sign in.');
        setStep('login');
        setPassword1('');
        setPassword2('');
      } else setError(data.message || 'Failed');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reset');
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1E2126] rounded-xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              {!logoError ? (
                <img
                  src={SwifterzLogo}
                  alt="Swifterz"
                  className="h-16 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : null}
              {logoError && (
                <div className="h-12 px-6 rounded bg-slate-700 flex items-center justify-center text-white font-semibold">
                  Swifterz
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              {step === 'login' && 'Sign In'}
              {step === 'forgot' && 'Forgot Password'}
              {step === 'otp' && 'Enter OTP'}
              {step === 'reset' && 'Reset Password'}
            </h2>
            <p className="text-slate-400 text-sm text-center mb-6">
              {step === 'login' && 'Login to stay connected.'}
              {step === 'forgot' && 'Provide your email to receive an OTP.'}
              {(step === 'otp' || step === 'reset') && message}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/20 text-amber-200 text-sm">{error}</div>
            )}

            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50"
                  >
                    {submitting ? 'Signing in...' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('forgot'); setError(''); }}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}

            {step === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep('login'); setError(''); }}
                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50">
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-1">OTP</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={5}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    placeholder="Enter OTP"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setStep('forgot'); setError(''); }} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700">Back</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50">{submitting ? 'Verifying...' : 'Reset'}</button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="relative">
                  <label htmlFor="newpassword" className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                  <input
                    id="newpassword"
                    type={showPassword1 ? 'text' : 'password'}
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword1(!showPassword1)} className="absolute right-3 top-9 text-slate-400 hover:text-white" aria-label="Toggle visibility">
                    {showPassword1 ? '🙈' : '👁'}
                  </button>
                </div>
                <div className="relative">
                  <label htmlFor="confirmpassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                  <input
                    id="confirmpassword"
                    type={showPassword2 ? 'text' : 'password'}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword2(!showPassword2)} className="absolute right-3 top-9 text-slate-400 hover:text-white" aria-label="Toggle visibility">
                    {showPassword2 ? '🙈' : '👁'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setStep('otp'); setError(''); }} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700">Back</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
        <p className="text-center mt-4 text-slate-600 text-sm">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
