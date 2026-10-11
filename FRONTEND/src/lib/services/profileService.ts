import api from '../api';
import { supabase } from '../supabase';
import type { Profile, ProfileUpdateInput } from '../../types';

export const getMyProfile = async (): Promise<Profile> => {
  // 1. Instant Cache Return (0ms)
  try {
    const cached = localStorage.getItem('wt_user_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id) return parsed as Profile;
    }
  } catch {}

  // 2. Direct Supabase Query (~50ms)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        try { localStorage.setItem('wt_user_profile', JSON.stringify(data)); } catch {}
        return data as Profile;
      }
    }
  } catch {}

  // 3. Backend API Fallback
  try {
    const response = await api.get<Profile>('/profiles/me');
    if (response.data) {
      try { localStorage.setItem('wt_user_profile', JSON.stringify(response.data)); } catch {}
      return response.data;
    }
  } catch (err) {
    console.warn('[profileService] Backend /profiles/me failed:', err);
  }

  throw new Error('Profile not found');
};

export const updateMyProfile = async (
  data: ProfileUpdateInput
): Promise<Profile> => {
  try {
    const response = await api.put<Profile>('/profiles/me', data);
    if (response.data) {
      try { localStorage.setItem('wt_user_profile', JSON.stringify(response.data)); } catch {}
      return response.data;
    }
  } catch (backendError) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw backendError;
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();
      if (!error && updated) {
        try { localStorage.setItem('wt_user_profile', JSON.stringify(updated)); } catch {}
        return updated as Profile;
      }
    } catch {}
    throw backendError;
  }
  throw new Error('Failed to update profile');
};
