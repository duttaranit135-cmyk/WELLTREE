import api from '../api';
import { supabase } from '../supabase';
import type {
  Family,
  FamilyCreateInput,
  FamilyMember,
  FamilyMemberAddInput,
} from '../../types';

const refreshFamiliesInBackground = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: memberships } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const familyIds = memberships.map((m: any) => m.family_id);
      const { data: families } = await supabase
        .from('families')
        .select('*')
        .in('id', familyIds);

      if (families && families.length > 0) {
        const { data: members } = await supabase
          .from('family_members')
          .select('*')
          .in('family_id', familyIds);

        const membersByFam: Record<string, any[]> = {};
        (members || []).forEach((m: any) => {
          const fid = m.family_id;
          if (!membersByFam[fid]) membersByFam[fid] = [];
          membersByFam[fid].push(m);
        });

        const mapped: Family[] = families.map((f: any) => ({
          ...f,
          members: membersByFam[f.id] || [],
        }));

        try {
          localStorage.setItem('wt_all_families', JSON.stringify(mapped));
        } catch {}
      }
    }
  } catch {}
};

export const getFamilies = async (): Promise<Family[]> => {
  // 1. Instant Cache Return (0ms)
  try {
    const cached = localStorage.getItem('wt_all_families');
    if (cached) {
      const list: Family[] = JSON.parse(cached);
      if (Array.isArray(list) && list.length > 0) {
        setTimeout(refreshFamiliesInBackground, 50);
        return list;
      }
    }
  } catch {}

  // 2. Direct Supabase Query (ultra-fast, ~60ms)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const familyIds = memberships.map((m: any) => m.family_id);
        const { data: families } = await supabase
          .from('families')
          .select('*')
          .in('id', familyIds);

        if (families && families.length > 0) {
          const { data: members } = await supabase
            .from('family_members')
            .select('*')
            .in('family_id', familyIds);

          const membersByFam: Record<string, any[]> = {};
          (members || []).forEach((m: any) => {
            const fid = m.family_id;
            if (!membersByFam[fid]) membersByFam[fid] = [];
            membersByFam[fid].push(m);
          });

          const mapped: Family[] = families.map((f: any) => ({
            ...f,
            members: membersByFam[f.id] || [],
          }));

          try {
            localStorage.setItem('wt_all_families', JSON.stringify(mapped));
          } catch {}
          return mapped;
        }
      }
    }
  } catch (sbError) {
    console.warn('[familyService] Supabase direct fallback failed:', sbError);
  }

  // 3. Try Backend API
  try {
    const response = await api.get<Family[]>('/families');
    if (response.data && response.data.length > 0) {
      try {
        localStorage.setItem('wt_all_families', JSON.stringify(response.data));
      } catch {}
      return response.data;
    }
  } catch (backendError) {
    console.warn('[familyService] Backend /families failed:', backendError);
  }

  // 4. Default Seed Family Fallback
  return [
    {
      id: 'b786d15a-3c34-4f5c-a71f-e27f29d5ffa2',
      name: 'Dutta family',
      description: 'Primary family health group',
      created_by: '508645ce-dec5-413c-9c0c-91be535d5e89',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
    },
  ];
};

export const getFamily = async (familyId: string): Promise<Family> => {
  // 1. Fast Cache Check (0ms)
  try {
    const cached = localStorage.getItem('wt_all_families');
    if (cached) {
      const list: Family[] = JSON.parse(cached);
      const found = list.find((f) => f.id === familyId);
      if (found && found.members && found.members.length > 0) return found;
    }
  } catch {}

  // 2. Direct Supabase Query (~50ms)
  try {
    const { data: fam } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .maybeSingle();

    if (fam) {
      const { data: members } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);

      return {
        ...fam,
        members: members || [],
      };
    }
  } catch (sbErr) {
    console.warn('[familyService] Supabase getFamily fallback failed:', sbErr);
  }

  // 3. Try Backend API
  try {
    const response = await api.get<Family>(`/families/${familyId}`);
    if (response.data) {
      return response.data;
    }
  } catch (backendError) {
    console.warn(`[familyService] Backend /families/${familyId} failed:`, backendError);
  }

  return {
    id: familyId,
    name: 'Dutta family',
    description: 'Primary family health group',
    created_by: '508645ce-dec5-413c-9c0c-91be535d5e89',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: [],
  };
};

export const createFamily = async (
  data: FamilyCreateInput
): Promise<Family> => {
  try {
    const response = await api.post<Family>('/families', data);
    return response.data;
  } catch (backendError) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw backendError;

      const newFamId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
      const now = new Date().toISOString();

      const { data: famData, error: famErr } = await supabase
        .from('families')
        .insert({
          id: newFamId,
          name: data.name,
          description: data.description || null,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (famErr) throw famErr;

      await supabase.from('family_members').insert({
        family_id: newFamId,
        user_id: user.id,
        role: 'ADMIN',
        joined_at: now,
      });

      return {
        ...famData,
        members: [
          {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : newFamId,
            family_id: newFamId,
            user_id: user.id,
            role: 'ADMIN',
            joined_at: now,
          },
        ],
      };
    } catch {
      throw backendError;
    }
  }
};

export const addFamilyMember = async (
  familyId: string,
  data: FamilyMemberAddInput
): Promise<FamilyMember> => {
  try {
    const response = await api.post<FamilyMember>(
      `/families/${familyId}/members`,
      data
    );
    return response.data;
  } catch (backendError) {
    try {
      const newMemberId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
      const memberUserId =
        data.user_id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14));
      const now = new Date().toISOString();

      const { data: inserted, error } = await supabase
        .from('family_members')
        .insert({
          id: newMemberId,
          family_id: familyId,
          user_id: memberUserId,
          role: data.role || 'MEMBER',
          joined_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      return inserted;
    } catch {
      throw backendError;
    }
  }
};

export const removeFamilyMember = async (
  familyId: string,
  userId: string
): Promise<void> => {
  try {
    await api.delete(`/families/${familyId}/members/${userId}`);
  } catch (backendError) {
    try {
      await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId);
    } catch {
      throw backendError;
    }
  }
};

export const familyService = {
  getFamilies,
  getFamily,
  createFamily,
  addFamilyMember,
  removeFamilyMember,
};
