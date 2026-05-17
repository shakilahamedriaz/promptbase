import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { ToastProvider } from '@/components/Toast';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { GoogleCallbackPage } from '@/features/auth/GoogleCallbackPage';
import { HomePage } from '@/features/home/HomePage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { RefinerPage } from '@/features/refiner/RefinerPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { MarketplacePage } from '@/features/marketplace/MarketplacePage';
import { CreatorProfilePage } from '@/features/creators/CreatorProfilePage';
import { EarningsDashboard } from '@/features/earnings/EarningsDashboard';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { tokenStore } from '@/api/client';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-700 text-lg">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { logout } = useAuthStore();
  const { theme } = useThemeStore();

  // Apply theme class on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Handle global auth:logout events from the axios interceptor
  useEffect(() => {
    const handler = () => {
      tokenStore.clear();
      logout();
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <BrowserRouter>
        <ToastProvider />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<GoogleCallbackPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="refiner" element={<RefinerPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="creators/:userId" element={<CreatorProfilePage />} />
            <Route path="earnings" element={<EarningsDashboard />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
}
