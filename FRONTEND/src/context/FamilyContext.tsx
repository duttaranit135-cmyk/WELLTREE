import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Family, FamilyMember, FamilyRole, ConsentPermission } from '../types';
import { familyService } from '../lib/services/familyService';
import { useAuth } from '../hooks/useAuth';
import { getAllFamilyMembers } from '../lib/utils';

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
  const [families, setFamilies] = useState<Family[]>(() => {
    try {
      const cached = localStorage.getItem('wt_all_families');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [activeFamily, setActiveFamilyState] = useState<Family | null>(() => {
    try {
      const cached = localStorage.getItem('wt_all_families');
      const savedFamilyId = localStorage.getItem('fhg_active_family_id');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          return list.find((f: any) => f.id === savedFamilyId) || list[0];
        }
      }
    } catch {}
    return null;
  });
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(() => {
    try {
      const cached = localStorage.getItem('wt_all_families');
      const savedFamilyId = localStorage.getItem('fhg_active_family_id');
      const savedMemberId = localStorage.getItem('fhg_active_member_id');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          const fam = list.find((f: any) => f.id === savedFamilyId) || list[0];
          const members = getAllFamilyMembers(fam, null);
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (savedMemberId && uuidRegex.test(savedMemberId)) {
            const found = members.find((m: any) => m.id === savedMemberId);
            if (found) return found;
          }
          return members[0] || null;
        }
      }
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchFamilies = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFamilies([]);
      setActiveFamilyState(null);
      setActiveMember(null);
      setIsLoading(false);
      return;
    }

    try {
      let data: Family[] = [];
      try {
        data = await familyService.getFamilies();
      } catch (e) {
        console.warn('[FamilyContext] Backend getFamilies failed, loading cached/local:', e);
      }

      if (!data || data.length === 0) {
        try {
          const cached = localStorage.getItem('wt_all_families');
          if (cached) data = JSON.parse(cached);
        } catch {}
      }

      if (!data || data.length === 0) {
        data = [
          {
            id: 'b786d15a-3c34-4f5c-a71f-e27f29d5ffa2',
            name: 'Dutta family',
            description: 'Primary family health management',
            created_by: user?.id || '508645ce-dec5-413c-9c0c-91be535d5e89',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'e2dac8d9-a707-46ba-86a0-c0de291c2adb',
            name: 'Hrishikesh Das',
            description: 'Extended family health guardian',
            created_by: user?.id || '508645ce-dec5-413c-9c0c-91be535d5e89',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      } else {
        try {
          localStorage.setItem('wt_all_families', JSON.stringify(data));
        } catch {}
      }

      setFamilies(data);

      if (data.length > 0) {
        // Restore from localStorage or pick the first family
        const savedFamilyId = localStorage.getItem('fhg_active_family_id');
        let matched = data.find((f: Family) => f.id === savedFamilyId) || data[0];

        // Fetch detailed family with members
        try {
          const detailed = await familyService.getFamily(matched.id);
          if (detailed) {
            matched = detailed;
          }
        } catch {
          // ignore error
        }

        const combinedMembers = getAllFamilyMembers(matched, user);
        matched = { ...matched, members: combinedMembers };
        setActiveFamilyState(matched);

        const savedMemberId = localStorage.getItem('fhg_active_member_id');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (savedMemberId && !uuidRegex.test(savedMemberId)) {
          try {
            localStorage.removeItem('fhg_active_member_id');
          } catch {}
        }
        const validSavedMemberId = savedMemberId && uuidRegex.test(savedMemberId) ? savedMemberId : null;
        const userMember =
          (validSavedMemberId && combinedMembers.find((m: FamilyMember) => m.id === validSavedMemberId)) ||
          combinedMembers.find((m: FamilyMember) => m.user_id === user.id) ||
          combinedMembers[0];

        setActiveMember(userMember || null);
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
    async (family: Family | null) => {
      if (family) {
        localStorage.setItem('fhg_active_family_id', family.id);
        let detailedFamily = family;
        try {
          const res = await familyService.getFamily(family.id);
          if (res) detailedFamily = res;
        } catch {}

        const combinedMembers = getAllFamilyMembers(detailedFamily, user);
        detailedFamily = { ...detailedFamily, members: combinedMembers };
        setActiveFamilyState(detailedFamily);

        const savedMemberId = localStorage.getItem('fhg_active_member_id');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (savedMemberId && !uuidRegex.test(savedMemberId)) {
          try {
            localStorage.removeItem('fhg_active_member_id');
          } catch {}
        }
        const validSavedMemberId = savedMemberId && uuidRegex.test(savedMemberId) ? savedMemberId : null;
        const userMember =
          (validSavedMemberId && combinedMembers.find((m: FamilyMember) => m.id === validSavedMemberId)) ||
          combinedMembers.find((m: FamilyMember) => m.user_id === user?.id) ||
          combinedMembers[0];

        setActiveMember(userMember || null);
      } else {
        localStorage.removeItem('fhg_active_family_id');
        localStorage.removeItem('fhg_active_member_id');
        setActiveFamilyState(null);
        setActiveMember(null);
      }
    },
    [user]
  );

  const handleSetActiveMember = useCallback((member: FamilyMember | null) => {
    setActiveMember(member);
    if (member) {
      localStorage.setItem('fhg_active_member_id', member.id);
    } else {
      localStorage.removeItem('fhg_active_member_id');
    }
  }, []);

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
      setActiveMember: handleSetActiveMember,
      hasPermission,
      isLoading,
      refetchFamilies: fetchFamilies,
    }),
    [families, activeFamily, activeMember, callerRole, setActiveFamily, handleSetActiveMember, hasPermission, isLoading, fetchFamilies]
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
