import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';

/**
 * Custom hook providing access to AuthContext.
 * Throws an error if used outside an AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
