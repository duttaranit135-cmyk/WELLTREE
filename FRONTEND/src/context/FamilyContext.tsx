import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Family, FamilyMember, FamilyRole, ConsentPermission } from '../types';
import { familyService } from '../lib/services/familyService';
import { useAuth } from '../hooks/useAuth';

interface FamilyContextType {
  families: Family[];
  activeFamily: Family | null;
  activeMember: FamilyMember | null;
  callerRole: FamilyRole;
  setActiveFamily: (family: Family | null) => void;
  setActiveMember: (member: FamilyMember | null) => void;
  hasPermission: (permission: ConsentPermission) => boolean;
  isLoading: boolean;
  refetchFamilies: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamily, setActiveFamilyState] = useState<Family | null>(null);
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFamilies = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFamilies([]);
      setActiveFamilyState(null);
      setActiveMember(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await familyService.getFamilies();
      setFamilies(data);

      if (data.length > 0) {
        // Restore from localStorage or pick the first family
        const savedFamilyId = localStorage.getItem('fhg_active_family_id');
        const matched = data.find((f: Family) => f.id === savedFamilyId) || data[0];
        setActiveFamilyState(matched);

        if (matched.members && matched.members.length > 0) {
          // Default to the user's member entry, or first member
          const userMember = matched.members.find((m: FamilyMember) => m.user_id === user.id) || matched.members[0];
          setActiveMember(userMember);
        } else {
          setActiveMember(null);
        }
      } else {
        setActiveFamilyState(null);
        setActiveMember(null);
      }
    } catch (err) {
      console.warn('[FamilyContext] Failed to load families:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const setActiveFamily = useCallback(
    (family: Family | null) => {
      setActiveFamilyState(family);
      if (family) {
        localStorage.setItem('fhg_active_family_id', family.id);
        if (family.members && family.members.length > 0 && user) {
          const userMember = family.members.find((m) => m.user_id === user.id) || family.members[0];
          setActiveMember(userMember);
        } else {
          setActiveMember(null);
        }
      } else {
        localStorage.removeItem('fhg_active_family_id');
        setActiveMember(null);
      }
    },
    [user]
  );

  // Compute caller's role in active family
  const callerRole: FamilyRole = useMemo(() => {
    if (!activeFamily || !user) return 'MEMBER';
    if (activeFamily.created_by === user.id) return 'ADMIN';
    const member = activeFamily.members?.find((m) => m.user_id === user.id);
    return member?.role || 'MEMBER';
  }, [activeFamily, user]);

  // Permission validator
  const hasPermission = useCallback(
    (permission: ConsentPermission): boolean => {
      if (callerRole === 'ADMIN') return true;
      if (permission === 'READ_ONLY') return true;
      return callerRole === 'GUARDIAN';
    },
    [callerRole]
  );

  const value = useMemo(
    () => ({
      families,
      activeFamily,
      activeMember,
      callerRole,
      setActiveFamily,
      setActiveMember,
      hasPermission,
      isLoading,
      refetchFamilies: fetchFamilies,
    }),
    [families, activeFamily, activeMember, callerRole, setActiveFamily, hasPermission, isLoading, fetchFamilies]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};

export const useFamily = (): FamilyContextType => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
