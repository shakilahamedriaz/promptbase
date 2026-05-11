import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login?error=google_failed', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/library', { replace: true }))
      .catch(() => navigate('/login?error=google_failed', { replace: true }));
  }, [navigate, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-brand-500 mx-auto" />
        <p className="text-sm text-gray-400">Signing you in with Google…</p>
      </div>
    </div>
  );
}
