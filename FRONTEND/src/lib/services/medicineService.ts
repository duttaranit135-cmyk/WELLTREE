import api from '../api';
import { supabase } from '../supabase';
import type {
  Medicine,
  MedicineCreate,
  MedicineSchedule,
  MedicineScheduleCreate,
  MedicineLog,
  MedicineLogCreate,
} from '../../types';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (str?: string | null): boolean => Boolean(str && uuidRegex.test(str));

export const medicineService = {
  // Medicines
  getMedicines: async (familyMemberId?: string, isActive?: boolean): Promise<Medicine[]> => {
    // 1. Try Backend API
    if (!familyMemberId || isUUID(familyMemberId)) {
      try {
        const params: Record<string, any> = {};
        if (familyMemberId && isUUID(familyMemberId)) params.family_member_id = familyMemberId;
        if (isActive !== undefined) params.is_active = isActive;
        const res = await api.get<Medicine[]>('/medicines', { params });
        if (res.data) {
          try {
            if (familyMemberId) {
              localStorage.setItem(`wt_medicines_${familyMemberId}`, JSON.stringify(res.data));
            }
          } catch {}
          return res.data;
        }
      } catch (err) {
        console.warn('[medicineService] Backend /medicines failed, falling back to Supabase/cache:', err);
      }
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('medicines').select('*');
      if (familyMemberId && isUUID(familyMemberId)) {
        query = query.eq('family_member_id', familyMemberId);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      const { data, error } = await query;
      if (!error && data) {
        try {
          if (familyMemberId) {
            localStorage.setItem(`wt_medicines_${familyMemberId}`, JSON.stringify(data));
          }
        } catch {}
        return data as Medicine[];
      }
    } catch (sbErr) {
      console.warn('[medicineService] Supabase getMedicines fallback failed:', sbErr);
    }

    // 3. LocalStorage Cache Fallback
    try {
      if (familyMemberId) {
        const cached = localStorage.getItem(`wt_medicines_${familyMemberId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}

    return [];
  },

  getMedicineById: async (id: string): Promise<Medicine> => {
    if (isUUID(id)) {
      try {
        const res = await api.get<Medicine>(`/medicines/${id}`);
        if (res.data) return res.data;
      } catch (err) {
        console.warn(`[medicineService] Backend /medicines/${id} failed, trying Supabase:`, err);
      }
    }

    try {
      const { data, error } = await supabase.from('medicines').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data as Medicine;
    } catch {}

    throw new Error('Medicine not found');
  },

  createMedicine: async (data: MedicineCreate): Promise<Medicine> => {
    try {
      const res = await api.post<Medicine>('/medicines', data);
      if (res.data) return res.data;
    } catch (backendError) {
      console.warn('[medicineService] Backend createMedicine failed, trying Supabase:', backendError);
      try {
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
        const { data: inserted, error } = await supabase
          .from('medicines')
          .insert({
            id: newId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return inserted as Medicine;
      } catch {
        throw backendError;
      }
    }
    throw new Error('Failed to create medicine');
  },

  updateMedicine: async (id: string, data: Partial<MedicineCreate>): Promise<Medicine> => {
    try {
      const res = await api.put<Medicine>(`/medicines/${id}`, data);
      if (res.data) return res.data;
    } catch (backendError) {
      try {
        const { data: updated, error } = await supabase
          .from('medicines')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated as Medicine;
      } catch {
        throw backendError;
      }
    }
    throw new Error('Failed to update medicine');
  },

  deleteMedicine: async (id: string): Promise<void> => {
    try {
      await api.delete(`/medicines/${id}`);
    } catch (backendError) {
      try {
        await supabase.from('medicines').delete().eq('id', id);
      } catch {
        throw backendError;
      }
    }
  },

  // Schedules
  getSchedules: async (medicineId?: string, familyMemberId?: string): Promise<MedicineSchedule[]> => {
    // 1. Try Backend API
    const canQueryBackend = (!medicineId || isUUID(medicineId)) && (!familyMemberId || isUUID(familyMemberId));
    if (canQueryBackend) {
      try {
        const params: Record<string, any> = {};
        if (medicineId && isUUID(medicineId)) params.medicine_id = medicineId;
        if (familyMemberId && isUUID(familyMemberId)) params.family_member_id = familyMemberId;
        const res = await api.get<MedicineSchedule[]>('/medicine-schedules', { params });
        if (res.data) {
          try {
            const cacheKey = `wt_schedules_${familyMemberId || medicineId || 'all'}`;
            localStorage.setItem(cacheKey, JSON.stringify(res.data));
          } catch {}
          return res.data;
        }
      } catch (err) {
        console.warn('[medicineService] Backend /medicine-schedules failed, falling back:', err);
      }
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('medicine_schedules').select('*, medicine:medicines(*)');
      if (medicineId && isUUID(medicineId)) {
        query = query.eq('medicine_id', medicineId);
      }
      const { data, error } = await query;
      if (!error && data) {
        let filtered = data as MedicineSchedule[];
        if (familyMemberId) {
          filtered = filtered.filter(
            (s: any) => s.medicine?.family_member_id === familyMemberId || !s.medicine
          );
        }
        try {
          const cacheKey = `wt_schedules_${familyMemberId || medicineId || 'all'}`;
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
    } catch (sbErr) {
      console.warn('[medicineService] Supabase getSchedules fallback failed:', sbErr);
    }

    // 3. LocalStorage Cache Fallback
    try {
      const cacheKey = `wt_schedules_${familyMemberId || medicineId || 'all'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [];
  },

  createSchedule: async (data: MedicineScheduleCreate): Promise<MedicineSchedule> => {
    try {
      const res = await api.post<MedicineSchedule>('/medicine-schedules', data);
      if (res.data) return res.data;
    } catch (backendError) {
      console.warn('[medicineService] Backend createSchedule failed, falling back to Supabase:', backendError);
      try {
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
        const { data: inserted, error } = await supabase
          .from('medicine_schedules')
          .insert({
            id: newId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return inserted as MedicineSchedule;
      } catch {
        throw backendError;
      }
    }
    throw new Error('Failed to create schedule');
  },

  updateSchedule: async (id: string, data: Partial<MedicineScheduleCreate>): Promise<MedicineSchedule> => {
    try {
      const res = await api.put<MedicineSchedule>(`/medicine-schedules/${id}`, data);
      if (res.data) return res.data;
    } catch (backendError) {
      try {
        const { data: updated, error } = await supabase
          .from('medicine_schedules')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated as MedicineSchedule;
      } catch {
        throw backendError;
      }
    }
    throw new Error('Failed to update schedule');
  },

  deleteSchedule: async (id: string): Promise<void> => {
    try {
      await api.delete(`/medicine-schedules/${id}`);
    } catch (backendError) {
      try {
        await supabase.from('medicine_schedules').delete().eq('id', id);
      } catch {
        throw backendError;
      }
    }
  },

  // Logs
  getLogs: async (familyMemberId?: string, medicineId?: string, logStatus?: string): Promise<MedicineLog[]> => {
    // 1. Try Backend API
    const canQueryBackend = (!medicineId || isUUID(medicineId)) && (!familyMemberId || isUUID(familyMemberId));
    if (canQueryBackend) {
      try {
        const params: Record<string, any> = {};
        if (familyMemberId && isUUID(familyMemberId)) params.family_member_id = familyMemberId;
        if (medicineId && isUUID(medicineId)) params.medicine_id = medicineId;
        if (logStatus) params.log_status = logStatus;
        const res = await api.get<MedicineLog[]>('/medicine-logs', { params });
        if (res.data) {
          try {
            const cacheKey = `wt_logs_${familyMemberId || medicineId || 'all'}`;
            localStorage.setItem(cacheKey, JSON.stringify(res.data));
          } catch {}
          return res.data;
        }
      } catch (err) {
        console.warn('[medicineService] Backend /medicine-logs failed, falling back:', err);
      }
    }

    // 2. Direct Supabase Query Fallback
    try {
      let query = supabase.from('medicine_logs').select('*, medicine:medicines(*)');
      if (familyMemberId && isUUID(familyMemberId)) {
        query = query.eq('family_member_id', familyMemberId);
      }
      if (medicineId && isUUID(medicineId)) {
        query = query.eq('medicine_id', medicineId);
      }
      if (logStatus) {
        query = query.eq('status', logStatus);
      }
      const { data, error } = await query;
      if (!error && data) {
        try {
          const cacheKey = `wt_logs_${familyMemberId || medicineId || 'all'}`;
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        return data as MedicineLog[];
      }
    } catch (sbErr) {
      console.warn('[medicineService] Supabase getLogs fallback failed:', sbErr);
    }

    // 3. LocalStorage Cache Fallback
    try {
      const cacheKey = `wt_logs_${familyMemberId || medicineId || 'all'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [];
  },

  logDose: async (data: MedicineLogCreate): Promise<MedicineLog> => {
    try {
      const res = await api.post<MedicineLog>('/medicine-logs', data);
      if (res.data) return res.data;
    } catch (backendError) {
      console.warn('[medicineService] Backend logDose failed, falling back to Supabase:', backendError);
      try {
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14);
        const { data: inserted, error } = await supabase
          .from('medicine_logs')
          .insert({
            id: newId,
            ...data,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return inserted as MedicineLog;
      } catch {
        throw backendError;
      }
    }
    throw new Error('Failed to log dose');
  },
};
