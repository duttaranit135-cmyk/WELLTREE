import api from '../api';
import type { HealthRecord, HealthRecordCreate } from '../../types';

export const healthService = {
  getRecords: async (familyMemberId?: string): Promise<HealthRecord[]> => {
    const params = familyMemberId ? { family_member_id: familyMemberId } : {};
    const res = await api.get<HealthRecord[]>('/health-records', { params });
    return res.data;
  },

  getRecordById: async (id: string): Promise<HealthRecord> => {
    const res = await api.get<HealthRecord>(`/health-records/${id}`);
    return res.data;
  },

  createRecord: async (data: HealthRecordCreate): Promise<HealthRecord> => {
    const res = await api.post<HealthRecord>('/health-records', data);
    return res.data;
  },

  updateRecord: async (id: string, data: Partial<HealthRecordCreate>): Promise<HealthRecord> => {
    const res = await api.put<HealthRecord>(`/health-records/${id}`, data);
    return res.data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    await api.delete(`/health-records/${id}`);
  },
};
