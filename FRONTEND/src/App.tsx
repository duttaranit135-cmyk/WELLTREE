import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';
import { NotificationProvider } from './context/NotificationContext';
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
const HealthRecordsPage = lazy(() => import('./pages/HealthRecordsPage'));
const MedicinesPage = lazy(() => import('./pages/MedicinesPage'));
const MedicineSchedulesPage = lazy(() => import('./pages/MedicineSchedulesPage'));
const MedicalReportsPage = lazy(() => import('./pages/MedicalReportsPage'));
const EmergencyContactsPage = lazy(() => import('./pages/EmergencyContactsPage'));
const EmergencySOSPage = lazy(() => import('./pages/EmergencySOSPage'));
const SOSHistoryPage = lazy(() => import('./pages/SOSHistoryPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const DiabetesPredictionPage = lazy(() => import('./pages/DiabetesPredictionPage'));
const HypertensionPredictionPage = lazy(() => import('./pages/HypertensionPredictionPage'));
const SymptomCheckerPage = lazy(() => import('./pages/SymptomCheckerPage'));
const PredictionTrendsPage = lazy(() => import('./pages/PredictionTrendsPage'));
const PredictionHistoryPage = lazy(() => import('./pages/PredictionHistoryPage'));
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
const PublicOnlyRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FamilyProvider>
            <NotificationProvider>
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

                    {/* Public Guest Routes */}
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

                    {/* Authenticated Routes wrapped in persistent DashboardLayout */}
                    <Route element={<DashboardLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/families" element={<FamiliesPage />} />
                      <Route path="/families/create" element={<CreateFamilyPage />} />
                      <Route path="/families/:id" element={<FamilyDetailPage />} />
                      <Route path="/consents" element={<ConsentsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      
                      {/* Clinical & Health Management */}
                      <Route path="/health-records" element={<HealthRecordsPage />} />
                      <Route path="/medicines" element={<MedicinesPage />} />
                      <Route path="/medicine-schedules" element={<MedicineSchedulesPage />} />
                      <Route path="/medical-reports" element={<MedicalReportsPage />} />
                      
                      {/* Emergency Network & SOS */}
                      <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />
                      <Route path="/emergency/sos" element={<EmergencySOSPage />} />
                      <Route path="/emergency/sos/history" element={<SOSHistoryPage />} />

                      {/* Notifications & Ledger */}
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/audit-logs" element={<AuditLogsPage />} />

                      {/* AI Diagnostics Suite */}
                      <Route path="/predictions/diabetes" element={<DiabetesPredictionPage />} />
                      <Route path="/predictions/hypertension" element={<HypertensionPredictionPage />} />
                      <Route path="/predictions/symptom-checker" element={<SymptomCheckerPage />} />
                      <Route path="/predictions/trends" element={<PredictionTrendsPage />} />
                      <Route path="/predictions/history" element={<PredictionHistoryPage />} />
                    </Route>

                    {/* 404 Catch-All */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </NotificationProvider>
          </FamilyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
