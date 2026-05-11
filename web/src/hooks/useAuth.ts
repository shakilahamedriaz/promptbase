import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } =
    useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login({ email, password });
      navigate('/library', { replace: true });
    },
    [login, navigate],
  );

  const handleRegister = useCallback(
    async (email: string, password: string, displayName: string) => {
      await register({ email, password, display_name: displayName });
      navigate('/library', { replace: true });
    },
    [register, navigate],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const handleGoogleOAuth = useCallback(() => {
    const apiUrl = (import.meta as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/v1/auth/google`;
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    loginWithGoogle: handleGoogleOAuth,
    clearError,
  };
}
