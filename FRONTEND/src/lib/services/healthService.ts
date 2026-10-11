import api from '../api';
import { supabase } from '../supabase';
import type { HealthRecord, HealthRecordCreate } from '../../types';

const isUUID = (str?: string): boolean =>
  Boolean(
    str &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  );

export const healthService = {
  getRecords: async (familyMemberId?: string): Promise<HealthRecord[]> => {
    // 1. Instant Cache Return (0ms)
    if (familyMemberId) {
      try {
        const cached = localStorage.getItem(`wt_health_records_${familyMemberId}`);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch {}
    }

    // 2. Direct Supabase Query (~50ms)
    if (isUUID(familyMemberId)) {
      try {
        const { data, error } = await supabase
          .from('health_records')
          .select('*')
          .eq('family_member_id', familyMemberId);
        if (!error && data) {
          try {
            localStorage.setItem(`wt_health_records_${familyMemberId}`, JSON.stringify(data));
          } catch {}
          return data as HealthRecord[];
        }
      } catch {}
    }

    // 3. Backend API Fallback
    if (!familyMemberId || isUUID(familyMemberId)) {
      try {
        const params = isUUID(familyMemberId) ? { family_member_id: familyMemberId } : {};
        const res = await api.get<HealthRecord[]>('/health-records', { params });
        if (res.data) {
          try {
            if (familyMemberId) {
              localStorage.setItem(`wt_health_records_${familyMemberId}`, JSON.stringify(res.data));
            }
          } catch {}
          return res.data;
        }
      } catch (err) {
        console.warn('[healthService] Backend getRecords failed, using empty/cache:', err);
      }
    }

    return [];
  },

  getRecordById: async (id: string): Promise<HealthRecord> => {
    if (!isUUID(id)) {
      throw new Error('Local record');
    }
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data as HealthRecord;
    } catch {}

    const res = await api.get<HealthRecord>(`/health-records/${id}`);
    return res.data;
  },

  createRecord: async (data: HealthRecordCreate): Promise<HealthRecord> => {
    if (!isUUID(data.family_member_id)) {
      throw new Error('Local family member record');
    }
    try {
      const res = await api.post<HealthRecord>('/health-records', data);
      return res.data;
    } catch (backendError) {
      try {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
        const now = new Date().toISOString();
        const { data: inserted, error } = await supabase
          .from('health_records')
          .insert({
            id: newId,
            ...data,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        return inserted as HealthRecord;
      } catch {
        throw backendError;
      }
    }
  },

  updateRecord: async (id: string, data: Partial<HealthRecordCreate>): Promise<HealthRecord> => {
    if (!isUUID(id)) {
      throw new Error('Local health record');
    }
    try {
      const res = await api.put<HealthRecord>(`/health-records/${id}`, data);
      return res.data;
    } catch (backendError) {
      try {
        const { data: updated, error } = await supabase
          .from('health_records')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated as HealthRecord;
      } catch {
        throw backendError;
      }
    }
  },

  deleteRecord: async (id: string): Promise<void> => {
    if (!isUUID(id)) return;
    try {
      await api.delete(`/health-records/${id}`);
    } catch {
      try {
        await supabase.from('health_records').delete().eq('id', id);
      } catch {}
    }
  },
};
