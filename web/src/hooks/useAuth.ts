import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { api, tokenStore } from "@/api/client";

export function useAuth() {
  const navigate = useNavigate();
  const { setUser, setError, error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    clearError();
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, user } = response;

      // Store token in both localStorage and tokenStore
      localStorage.setItem("token", access_token);
      tokenStore.set(access_token);
      setUser(user);

      // Redirect to home
      navigate("/");
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setUser, setError, clearError]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    clearError();
    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", { email, password, display_name: displayName });
      const { access_token, user } = response;

      localStorage.setItem("token", access_token);
      tokenStore.set(access_token);
      setUser(user);
      navigate("/");
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setUser, setError, clearError]);

  const loginWithGoogle = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/google-callback", { code });
      const { access_token, user } = response;

      localStorage.setItem("token", access_token);
      tokenStore.set(access_token);
      setUser(user);
      navigate("/");
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || "Google login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setUser, setError, clearError]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }, [navigate, setUser]);

  return {
    login,
    register,
    loginWithGoogle,
    logout,
    isLoading,
    error,
    clearError,
  };
}
