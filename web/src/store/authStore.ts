import { create } from 'zustand';
import { tokenStore } from '@/api/client';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  logout: () => {
    tokenStore.clear();
    set({ user: null, isAuthenticated: false, error: null });
  },
  refreshUser: async () => {
    set({ isLoading: true });
    try {
      // Try to get token from localStorage or memory
      let token = tokenStore.get();
      if (!token) {
        token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          tokenStore.set(token);
        }
      }

      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await fetch('http://localhost:8000/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        set({ user, isAuthenticated: true, error: null, isLoading: false });
      } else {
        // Token is invalid, clear it
        tokenStore.clear();
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
}));
