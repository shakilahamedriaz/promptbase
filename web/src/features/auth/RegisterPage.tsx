import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { AuthVisual } from './AuthVisual';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function RegisterPage() {
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [displayName, setDisplayName]         = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [localError, setLocalError]           = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    try { await register(email, password, displayName); } catch { }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#8B5CF6';
    e.target.style.boxShadow   = '0 0 0 3px rgba(139,92,246,0.12)';
    e.target.style.background  = '#ffffff';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#DDD9ED';
    e.target.style.boxShadow   = 'none';
    e.target.style.background  = '#F8F7FF';
  };

  const displayedError = localError || error;

  const strengthLevel =
    password.length === 0 ? 0 :
    password.length < 6   ? 1 :
    password.length < 10  ? 2 :
    password.length < 14  ? 3 : 4;

  const strengthColor = ['#E9E7F4', '#EF4444', '#F97316', '#EAB308', '#22C55E'][strengthLevel];

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-[48%] shrink-0" style={{ minHeight: '100vh' }}>
        <AuthVisual />
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-start justify-center px-6 py-12 overflow-y-auto" style={{ background: '#FAFAFE' }}>
        <div className="w-full max-w-[360px]">

          {/* Heading */}
          <div className="mb-7">
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
              className="font-extrabold leading-[1.05] tracking-tight mb-2"
              style={{ fontSize: 'clamp(32px, 3.8vw, 42px)', color: '#0f172a', letterSpacing: '-0.04em' }}
            >
              Create your account
            </h1>
            <p className="text-[14px] text-gray-500">
              Already have one?{' '}
              <Link to="/login" className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border bg-white px-4 py-3 text-[13px] font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]"
            style={{ borderColor: '#E4E2EE' }}
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#E9E7F4' }} />
            <span className="text-[11px] font-medium text-gray-400">or with email</span>
            <div className="flex-1 h-px" style={{ background: '#E9E7F4' }} />
          </div>

          {/* Error */}
          {displayedError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{displayedError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label htmlFor="displayName" className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                Your name
              </label>
              <input
                id="displayName" type="text" autoComplete="name" required autoFocus
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                className="block w-full rounded-xl border px-4 py-3 text-[14px] text-gray-800 placeholder-gray-300 transition-all focus:outline-none"
                style={{ borderColor: '#DDD9ED', background: '#F8F7FF' }}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                Email address
              </label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full rounded-xl border px-4 py-3 text-[14px] text-gray-800 placeholder-gray-300 transition-all focus:outline-none"
                style={{ borderColor: '#DDD9ED', background: '#F8F7FF' }}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full rounded-xl border px-4 py-3 pr-11 text-[14px] text-gray-800 placeholder-gray-300 transition-all focus:outline-none"
                  style={{ borderColor: '#DDD9ED', background: '#F8F7FF' }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strengthLevel ? strengthColor : '#E9E7F4' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="block w-full rounded-xl border px-4 py-3 pr-11 text-[14px] text-gray-800 placeholder-gray-300 transition-all focus:outline-none"
                  style={{ borderColor: '#DDD9ED', background: '#F8F7FF' }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8B5CF6 50%, #7C3AED 100%)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : 'Create free account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-gray-400">
            By signing up you agree to our{' '}
            <a href="#" className="text-violet-600 hover:text-violet-700">Terms</a>
            {' '}&amp;{' '}
            <a href="#" className="text-violet-600 hover:text-violet-700">Privacy Policy</a>
          </p>

          <p className="mt-6 text-center text-[11px] text-gray-300">
            © 2025 PromptVault Pro
          </p>
        </div>
      </div>

    </div>
  );
}
