import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Custom hook to guard routes programmatically.
 * Redirects to /login if unauthenticated after initial session loading finishes.
 */
export const useAuthGuard = (redirectPath: string = '/login') => {
  const { isAuthenticated, isLoading, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectPath, { replace: true, state: { from: location } });
    }
  }, [isLoading, isAuthenticated, navigate, redirectPath, location]);

  return { isAuthenticated, isLoading, user, profile };
};

export default useAuthGuard;
