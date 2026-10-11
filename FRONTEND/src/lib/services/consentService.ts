import api from '../api';
import { supabase } from '../supabase';
import type {
  Consent,
  ConsentCreateInput,
  ConsentUpdateInput,
} from '../../types';

const refreshConsentsInBackground = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('consents')
      .select('*')
      .or(`granter_id.eq.${user.id},grantee_id.eq.${user.id}`);
    if (!error && data) {
      try { localStorage.setItem('wt_user_consents', JSON.stringify(data)); } catch {}
    }
  } catch {}
};

export const getConsents = async (): Promise<Consent[]> => {
  // 1. Instant Cache Return (0ms)
  try {
    const cached = localStorage.getItem('wt_user_consents');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list) && list.length > 0) {
        setTimeout(refreshConsentsInBackground, 50);
        return list;
      }
    }
  } catch {}

  // 2. Direct Supabase Query (~50ms)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .or(`granter_id.eq.${user.id},grantee_id.eq.${user.id}`);
      if (!error && data) {
        try { localStorage.setItem('wt_user_consents', JSON.stringify(data)); } catch {}
        return data as Consent[];
      }
    }
  } catch {}

  // 3. Backend API Fallback
  try {
    const response = await api.get<Consent[]>('/consents');
    if (response.data) {
      try { localStorage.setItem('wt_user_consents', JSON.stringify(response.data)); } catch {}
      return response.data;
    }
  } catch (err) {
    console.warn('[consentService] getConsents backend failed:', err);
  }

  return [];
};

export const createConsent = async (
  data: ConsentCreateInput
): Promise<Consent> => {
  try {
    const response = await api.post<Consent>('/consents', data);
    return response.data;
  } catch (backendError) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw backendError;
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
      const now = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from('consents')
        .insert({
          id: newId,
          granter_id: user.id,
          grantee_id: data.grantee_id,
          family_id: data.family_id,
          permission_level: data.permission_level,
          status: 'PENDING',
          notes: data.notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      return inserted as Consent;
    } catch {
      throw backendError;
    }
  }
};

export const updateConsent = async (
  consentId: string,
  data: ConsentUpdateInput
): Promise<Consent> => {
  try {
    const response = await api.patch<Consent>(`/consents/${consentId}`, data);
    return response.data;
  } catch (backendError) {
    try {
      const { data: updated, error } = await supabase
        .from('consents')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', consentId)
        .select()
        .single();
      if (error) throw error;
      return updated as Consent;
    } catch {
      throw backendError;
    }
  }
};
