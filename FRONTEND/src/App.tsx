import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Code-split page components with React.lazy
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage'));
const CreateFamilyPage = lazy(() => import('./pages/CreateFamilyPage'));
const FamilyDetailPage = lazy(() => import('./pages/FamilyDetailPage'));
const ConsentsPage = lazy(() => import('./pages/ConsentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * Public route wrapper that redirects to /dashboard if already authenticated
 */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0F172A',
                  color: '#F8FAFC',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                },
                success: {
                  iconTheme: {
                    primary: '#0F766E',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#E11D48',
                    secondary: '#FFFFFF',
                  },
                },
              }}
            />

            <Suspense fallback={<LoadingSpinner size="fullPage" />}>
              <Routes>
                {/* Public Marketing Route */}
                <Route path="/" element={<LandingPage />} />

                {/* Public Guest Routes (Redirect to /dashboard if logged in) */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <RegisterPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Authenticated Routes wrapped in DashboardLayout */}
                <Route
                  path="/dashboard"
                  element={
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/families"
                  element={
                    <DashboardLayout>
                      <FamiliesPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/families/create"
                  element={
                    <DashboardLayout>
                      <CreateFamilyPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/families/:id"
                  element={
                    <DashboardLayout>
                      <FamilyDetailPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/consents"
                  element={
                    <DashboardLayout>
                      <ConsentsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <DashboardLayout>
                      <ProfilePage />
                    </DashboardLayout>
                  }
                />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
