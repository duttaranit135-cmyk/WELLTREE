import api from '../api';
import { supabase } from '../supabase';
import type {
  EmergencyContact,
  EmergencyContactCreate,
  EmergencySOS,
  SOSEventCreate,
  SOSEventStatus,
} from '../../types';

export const emergencyService = {
  // Contacts
  getContacts: async (familyMemberId?: string, isActive?: boolean): Promise<EmergencyContact[]> => {
    // 1. Direct Supabase Query (~50ms)
    try {
      let query = supabase.from('emergency_contacts').select('*');
      if (familyMemberId) query = query.eq('family_member_id', familyMemberId);
      if (isActive !== undefined) query = query.eq('is_active', isActive);
      query = query.order('priority', { ascending: true });
      const { data, error } = await query;
      if (!error && data) return data as EmergencyContact[];
    } catch {}

    // 2. Backend API fallback
    try {
      const params: Record<string, any> = {};
      if (familyMemberId) params.family_member_id = familyMemberId;
      if (isActive !== undefined) params.is_active = isActive;
      const res = await api.get<EmergencyContact[]>('/emergency-contacts', { params });
      return res.data || [];
    } catch {
      return [];
    }
  },

  createContact: async (data: EmergencyContactCreate): Promise<EmergencyContact> => {
    try {
      const res = await api.post<EmergencyContact>('/emergency-contacts', data);
      return res.data;
    } catch (backendError) {
      try {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
        const { data: inserted, error } = await supabase
          .from('emergency_contacts')
          .insert({
            id: newId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (!error && inserted) return inserted as EmergencyContact;
      } catch {}
      throw backendError;
    }
  },

  updateContact: async (id: string, data: Partial<EmergencyContactCreate>): Promise<EmergencyContact> => {
    try {
      const res = await api.put<EmergencyContact>(`/emergency-contacts/${id}`, data);
      return res.data;
    } catch (backendError) {
      try {
        const { data: updated, error } = await supabase
          .from('emergency_contacts')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (!error && updated) return updated as EmergencyContact;
      } catch {}
      throw backendError;
    }
  },

  deleteContact: async (id: string): Promise<void> => {
    try {
      await api.delete(`/emergency-contacts/${id}`);
    } catch (backendError) {
      try {
        await supabase.from('emergency_contacts').delete().eq('id', id);
      } catch {
        throw backendError;
      }
    }
  },

  // SOS Events
  triggerSOS: async (data: SOSEventCreate): Promise<EmergencySOS> => {
    const res = await api.post<EmergencySOS>('/emergency/sos', data);
    return res.data;
  },

  getSOSHistory: async (familyMemberId?: string, status?: string): Promise<EmergencySOS[]> => {
    try {
      let query = supabase.from('sos_events').select('*').order('triggered_at', { ascending: false });
      if (familyMemberId) query = query.eq('family_member_id', familyMemberId);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (!error && data) return data as EmergencySOS[];
    } catch {}

    try {
      const params: Record<string, any> = {};
      if (familyMemberId) params.family_member_id = familyMemberId;
      if (status) params.status = status;
      const res = await api.get<EmergencySOS[]>('/emergency/sos/history', { params });
      return res.data || [];
    } catch {
      return [];
    }
  },

  updateSOSStatus: async (id: string, status: SOSEventStatus, notes?: string): Promise<EmergencySOS> => {
    try {
      const res = await api.patch<EmergencySOS>(`/emergency/sos/${id}/status`, { status, notes });
      return res.data;
    } catch (backendError) {
      try {
        const updatePayload: Record<string, any> = { status };
        if (notes) updatePayload.notes = notes;
        if (status === 'RESOLVED') updatePayload.resolved_at = new Date().toISOString();
        const { data: updated, error } = await supabase
          .from('sos_events')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        if (!error && updated) return updated as EmergencySOS;
      } catch {}
      throw backendError;
    }
  },
};
