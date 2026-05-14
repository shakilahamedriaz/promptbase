import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

const PERKS = [
  'Unlimited prompt storage',
  '20 AI refinements per day',
  '30-day usage history',
  'Browser extension included',
];

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

const inputCls = 'block w-full rounded-xl border bg-white px-4 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100/60';

export function RegisterPage() {
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    try { await register(email, password, displayName); } catch { }
  };

  const displayedError = localError || error;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[44%] bg-gradient-to-br from-brand-50 via-brand-100 to-purple-100 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">PromptVault Pro</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">Free forever</p>
          <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-4">Everything you need<br />to prompt better.</h2>
          <ul className="mt-8 space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-sage-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-400">© 2025 PromptVault Pro</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-gray-500">No credit card required</p>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or with email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {displayedError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {displayedError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Your name</label>
              <input id="displayName" type="text" autoComplete="name" required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
              <input id="password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputCls} />
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mt-1 py-2.5 rounded-xl text-sm font-semibold">
              Create Free Account
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            By signing up you agree to our{' '}
            <a href="#" className="text-brand-500 hover:text-brand-700">Terms</a> &amp;{' '}
            <a href="#" className="text-brand-500 hover:text-brand-700">Privacy Policy</a>
          </p>
          <p className="mt-4 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
