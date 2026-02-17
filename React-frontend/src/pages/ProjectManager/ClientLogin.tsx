import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SwifterzLogo from '../assets/SwifterzLogo.png';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { clientLogin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await clientLogin(email, password);
    setSubmitting(false);
    if (result.success) navigate('/client/dashboard', { replace: true });
    else setError(result.message || 'Login failed');
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
            <h2 className="text-xl font-semibold text-white text-center mb-1">Client Sign In</h2>
            <p className="text-slate-400 text-sm text-center mb-6">Login to view your projects and milestones.</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/20 text-amber-200 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-[#3d3399] hover:bg-[#2d2389] text-white font-medium transition disabled:opacity-50"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-slate-400 text-sm">
              Staff login? <Link to="/login" className="text-indigo-400 hover:underline">Sign in here</Link>
            </p>
          </div>
        </div>
        <p className="text-center mt-4">
          <Link to="/" className="text-slate-600 hover:underline text-sm">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
