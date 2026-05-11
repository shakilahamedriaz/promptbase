import { create } from 'zustand';
import { api, tokenStore } from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  auth_provider: 'email' | 'google';
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
  last_login_at: string | null;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        email: payload.email,
        password: payload.password,
      });
      tokenStore.set(data.access_token);
      window.dispatchEvent(new CustomEvent('PV_AUTH_SYNC', { detail: { token: data.access_token } }));
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/register', payload);
      tokenStore.set(data.access_token);
      window.dispatchEvent(new CustomEvent('PV_AUTH_SYNC', { detail: { token: data.access_token } }));
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('PV_AUTH_LOGOUT'));
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  refreshUser: async () => {
    set({ isLoading: true });
    try {
      const data = await api.post<AuthResponse>('/auth/refresh', {});
      tokenStore.set(data.access_token);
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  clearError: () => set({ error: null }),
}));
