import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import SwifterzLogo from '../../assets/ProductNavbarIcons/swifterzlogo.png';
import loginBackground from '../../assets/login_bg.png';

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
  // const location = useLocation();
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) navigate('/', { replace: true });
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
    <div
      className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 100%',
        backgroundPosition: 'right center',
      }}
    >
      <div className="w-full max-w-lg">
        <div className="bg-white/95 rounded-[32px] shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden px-10 py-10">
          <div className="mb-8">
            {!logoError ? (
              <img
                src={SwifterzLogo}
                alt="Swifterz"
                className="h-10 w-auto object-contain mb-6"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="inline-flex h-10 px-6 rounded-full bg-slate-900 text-white items-center justify-center font-semibold mb-6">
                Swifterz
              </div>
            )}
            <p className="text-sm font-medium text-rose-500 mb-1">Welcome to SwiftBIM</p>
            <h2 className="text-[32px] leading-tight font-semibold text-slate-900 mb-2">
              {step === 'login' && 'Login'}
              {step === 'forgot' && 'Forgot Password'}
              {step === 'otp' && 'Enter OTP'}
              {step === 'reset' && 'Reset Password'}
            </h2>
            <p className="text-slate-500 text-sm">
              {step === 'login' && 'Enter your details to access your account.'}
              {step === 'forgot' && 'Provide your email to receive an OTP.'}
              {(step === 'otp' || step === 'reset') && message}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
              {error}
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Enter your email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Username or email address"
                  required
                />
              </div>
              <div>
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Enter your Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 pr-10"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('forgot');
                      setError('');
                    }}
                    className="text-[11px] font-medium text-sky-500 hover:text-sky-600"
                  >
                    Forgot Password
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex justify-center items-center px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Signing in...' : 'Login'}
                </button>
              </div>
              <p className="pt-1 text-center text-[11px] text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-rose-500 hover:text-rose-600"
                >
                  Register Now
                </button>
              </p>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Enter your email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setError('');
                  }}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={5}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  placeholder="Enter OTP"
                  required
                />
              </div>
              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('forgot');
                    setError('');
                  }}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : 'Reset'}
                </button>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <label
                  htmlFor="newpassword"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Password
                </label>
                <input
                  id="newpassword"
                  type={showPassword1 ? 'text' : 'password'}
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword1(!showPassword1)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle visibility"
                >
                  {showPassword1 ? '🙈' : '👁'}
                </button>
              </div>
              <div className="relative">
                <label
                  htmlFor="confirmpassword"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmpassword"
                  type={showPassword2 ? 'text' : 'password'}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle visibility"
                >
                  {showPassword2 ? '🙈' : '👁'}
                </button>
              </div>
              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('otp');
                    setError('');
                  }}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="text-center mt-4 text-slate-500 text-xs">
          <Link to="/" className="hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
