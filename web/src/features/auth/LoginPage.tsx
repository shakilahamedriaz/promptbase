import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { AuthVisual } from './AuthVisual';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try { await login(email, password); } catch { }
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] shrink-0">
        <AuthVisual />
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col h-full overflow-y-auto"
        style={{ background: '#F4F3F8' }}
      >
        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-8 py-6">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-8">
              {/* Brand eyebrow */}
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: '#7C3AED' }}
                >
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <span
                  className="text-[11px] font-bold tracking-widest uppercase"
                  style={{ color: '#7C3AED', letterSpacing: '0.1em' }}
                >
                  PromptVault Pro
                </span>
              </div>

              <h1
                className="font-extrabold leading-[1.05] tracking-tight mb-2.5"
                style={{ fontSize: 'clamp(34px, 3.8vw, 44px)', color: '#0f172a', letterSpacing: '-0.04em' }}
              >
                Welcome back
              </h1>
              <p className="text-[14px] text-gray-500">
                No account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Create one free
                </Link>
              </p>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-[14px] font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-50 hover:shadow active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1"
              style={{ borderColor: '#D4D0E8' }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: '#DDD9ED' }} />
              <span className="text-[12px] font-medium text-gray-400 tracking-wide">or</span>
              <div className="flex-1 h-px" style={{ background: '#DDD9ED' }} />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <svg className="h-4 w-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-[13px] text-red-700 leading-snug">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-semibold text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="block w-full rounded-xl border bg-white px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  style={{ borderColor: '#DDD9ED' }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[13px] font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[12px] font-medium text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border bg-white px-4 py-3 pr-11 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                    style={{ borderColor: '#DDD9ED' }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  >
                    {showPass ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in
                  </>
                ) : 'Sign in'}
              </button>

            </form>

            {/* Trust */}
            <p className="mt-4 text-center text-[12px] text-gray-400">
              Free forever — no credit card required
            </p>

          </div>
        </div>

        {/* Footer */}
        <p className="shrink-0 py-5 text-center text-[11px] text-gray-400">
          © 2026 PromptVault Pro
        </p>
      </div>

    </div>
  );
}
