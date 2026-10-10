import api from '../api';
import type {
  Medicine,
  MedicineCreate,
  MedicineSchedule,
  MedicineScheduleCreate,
  MedicineLog,
  MedicineLogCreate,
} from '../../types';

export const medicineService = {
  // Medicines
  getMedicines: async (familyMemberId?: string, isActive?: boolean): Promise<Medicine[]> => {
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (isActive !== undefined) params.is_active = isActive;
    const res = await api.get<Medicine[]>('/medicines', { params });
    return res.data;
  },

  getMedicineById: async (id: string): Promise<Medicine> => {
    const res = await api.get<Medicine>(`/medicines/${id}`);
    return res.data;
  },

  createMedicine: async (data: MedicineCreate): Promise<Medicine> => {
    const res = await api.post<Medicine>('/medicines', data);
    return res.data;
  },

  updateMedicine: async (id: string, data: Partial<MedicineCreate>): Promise<Medicine> => {
    const res = await api.put<Medicine>(`/medicines/${id}`, data);
    return res.data;
  },

  deleteMedicine: async (id: string): Promise<void> => {
    await api.delete(`/medicines/${id}`);
  },

  // Schedules
  getSchedules: async (medicineId?: string, familyMemberId?: string): Promise<MedicineSchedule[]> => {
    const params: Record<string, any> = {};
    if (medicineId) params.medicine_id = medicineId;
    if (familyMemberId) params.family_member_id = familyMemberId;
    const res = await api.get<MedicineSchedule[]>('/medicine-schedules', { params });
    return res.data;
  },

  createSchedule: async (data: MedicineScheduleCreate): Promise<MedicineSchedule> => {
    const res = await api.post<MedicineSchedule>('/medicine-schedules', data);
    return res.data;
  },

  updateSchedule: async (id: string, data: Partial<MedicineScheduleCreate>): Promise<MedicineSchedule> => {
    const res = await api.put<MedicineSchedule>(`/medicine-schedules/${id}`, data);
    return res.data;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await api.delete(`/medicine-schedules/${id}`);
  },

  // Logs
  getLogs: async (familyMemberId?: string, medicineId?: string, logStatus?: string): Promise<MedicineLog[]> => {
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (medicineId) params.medicine_id = medicineId;
    if (logStatus) params.log_status = logStatus;
    const res = await api.get<MedicineLog[]>('/medicine-logs', { params });
    return res.data;
  },

  logDose: async (data: MedicineLogCreate): Promise<MedicineLog> => {
    const res = await api.post<MedicineLog>('/medicine-logs', data);
    return res.data;
  },
};
