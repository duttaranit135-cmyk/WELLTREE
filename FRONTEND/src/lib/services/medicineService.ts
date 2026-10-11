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

const isUUID = (str?: string): boolean =>
  Boolean(
    str &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
  );

export const medicineService = {
  // Medicines
  getMedicines: async (familyMemberId?: string, isActive?: boolean): Promise<Medicine[]> => {
    try {
      const params: Record<string, any> = {};
      if (isUUID(familyMemberId)) params.family_member_id = familyMemberId;
      if (isActive !== undefined) params.is_active = isActive;
      const res = await api.get<Medicine[]>('/medicines', { params });
      return res.data || [];
    } catch (backendError) {
      console.warn('[medicineService] Backend getMedicines failed, trying Supabase:', backendError);
      try {
        let q = supabase.from('medicines').select('*');
        if (isUUID(familyMemberId)) q = q.eq('family_member_id', familyMemberId);
        if (isActive !== undefined) q = q.eq('is_active', isActive);
        const { data, error } = await q;
        if (!error && data) return data;
      } catch (sbErr) {
        console.warn('[medicineService] Direct Supabase getMedicines error:', sbErr);
      }
      return [];
    }
  },

  getMedicineById: async (id: string): Promise<Medicine> => {
    try {
      const res = await api.get<Medicine>(`/medicines/${id}`);
      return res.data;
    } catch (err) {
      const { data } = await supabase.from('medicines').select('*').eq('id', id).single();
      if (data) return data;
      throw err;
    }
  },

  createMedicine: async (data: MedicineCreate): Promise<Medicine> => {
    try {
      const res = await api.post<Medicine>('/medicines', data);
      return res.data;
    } catch (err) {
      console.warn('[medicineService] Backend createMedicine failed, trying Supabase:', err);
      const { data: inserted, error } = await supabase.from('medicines').insert(data).select().single();
      if (!error && inserted) return inserted;
      throw err;
    }
  },

  updateMedicine: async (id: string, data: Partial<MedicineCreate>): Promise<Medicine> => {
    try {
      const res = await api.put<Medicine>(`/medicines/${id}`, data);
      return res.data;
    } catch (err) {
      console.warn('[medicineService] Backend updateMedicine failed, trying Supabase:', err);
      const { data: updated, error } = await supabase.from('medicines').update(data).eq('id', id).select().single();
      if (!error && updated) return updated;
      throw err;
    }
  },

  deleteMedicine: async (id: string): Promise<void> => {
    try {
      await api.delete(`/medicines/${id}`);
    } catch (err) {
      await supabase.from('medicines').delete().eq('id', id);
    }
  },

  // Schedules
  getSchedules: async (medicineId?: string, familyMemberId?: string): Promise<MedicineSchedule[]> => {
    try {
      const params: Record<string, any> = {};
      if (isUUID(medicineId)) params.medicine_id = medicineId;
      if (isUUID(familyMemberId)) params.family_member_id = familyMemberId;
      const res = await api.get<MedicineSchedule[]>('/medicine-schedules', { params });
      return res.data || [];
    } catch (backendError) {
      console.warn('[medicineService] Backend getSchedules failed, trying Supabase:', backendError);
      try {
        let q = supabase.from('medicine_schedules').select('*');
        if (isUUID(medicineId)) q = q.eq('medicine_id', medicineId);
        if (isUUID(familyMemberId)) q = q.eq('family_member_id', familyMemberId);
        const { data, error } = await q;
        if (!error && data) return data;
      } catch (sbErr) {
        console.warn('[medicineService] Direct Supabase getSchedules error:', sbErr);
      }
      return [];
    }
  },

  createSchedule: async (data: MedicineScheduleCreate): Promise<MedicineSchedule> => {
    try {
      const res = await api.post<MedicineSchedule>('/medicine-schedules', data);
      return res.data;
    } catch (err) {
      console.warn('[medicineService] Backend createSchedule failed, trying Supabase:', err);
      const { data: inserted, error } = await supabase.from('medicine_schedules').insert(data).select().single();
      if (!error && inserted) return inserted;
      throw err;
    }
  },

  updateSchedule: async (id: string, data: Partial<MedicineScheduleCreate>): Promise<MedicineSchedule> => {
    try {
      const res = await api.put<MedicineSchedule>(`/medicine-schedules/${id}`, data);
      return res.data;
    } catch (err) {
      const { data: updated, error } = await supabase.from('medicine_schedules').update(data).eq('id', id).select().single();
      if (!error && updated) return updated;
      throw err;
    }
  },

  deleteSchedule: async (id: string): Promise<void> => {
    try {
      await api.delete(`/medicine-schedules/${id}`);
    } catch (err) {
      await supabase.from('medicine_schedules').delete().eq('id', id);
    }
  },

  // Logs
  getLogs: async (familyMemberId?: string, medicineId?: string, logStatus?: string): Promise<MedicineLog[]> => {
    try {
      const params: Record<string, any> = {};
      if (isUUID(familyMemberId)) params.family_member_id = familyMemberId;
      if (isUUID(medicineId)) params.medicine_id = medicineId;
      if (logStatus) params.log_status = logStatus;
      const res = await api.get<MedicineLog[]>('/medicine-logs', { params });
      return res.data || [];
    } catch (backendError) {
      console.warn('[medicineService] Backend getLogs failed, trying Supabase:', backendError);
      try {
        let q = supabase.from('medicine_logs').select('*');
        if (isUUID(familyMemberId)) q = q.eq('family_member_id', familyMemberId);
        if (isUUID(medicineId)) q = q.eq('medicine_id', medicineId);
        if (logStatus) q = q.eq('status', logStatus);
        const { data, error } = await q;
        if (!error && data) return data;
      } catch (sbErr) {
        console.warn('[medicineService] Direct Supabase getLogs error:', sbErr);
      }
      return [];
    }
  },

  logDose: async (data: MedicineLogCreate): Promise<MedicineLog> => {
    try {
      const res = await api.post<MedicineLog>('/medicine-logs', data);
      return res.data;
    } catch (err) {
      const { data: inserted, error } = await supabase.from('medicine_logs').insert(data).select().single();
      if (!error && inserted) return inserted;
      throw err;
    }
  },
};
