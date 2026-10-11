import api from '../api';
import type { HealthRecord, HealthRecordCreate } from '../../types';

const isUUID = (str?: string): boolean =>
  Boolean(
    str &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
  );

export const healthService = {
  getRecords: async (familyMemberId?: string): Promise<HealthRecord[]> => {
    const params = isUUID(familyMemberId) ? { family_member_id: familyMemberId } : {};
    const res = await api.get<HealthRecord[]>('/health-records', { params });
    return res.data;
  },

  getRecordById: async (id: string): Promise<HealthRecord> => {
    if (!isUUID(id)) {
      throw new Error('Local record');
    }
    const res = await api.get<HealthRecord>(`/health-records/${id}`);
    return res.data;
  },

  createRecord: async (data: HealthRecordCreate): Promise<HealthRecord> => {
    if (!isUUID(data.family_member_id)) {
      throw new Error('Local family member record');
    }
    const res = await api.post<HealthRecord>('/health-records', data);
    return res.data;
  },

  updateRecord: async (id: string, data: Partial<HealthRecordCreate>): Promise<HealthRecord> => {
    if (!isUUID(id)) {
      throw new Error('Local health record');
    }
    const res = await api.put<HealthRecord>(`/health-records/${id}`, data);
    return res.data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    if (!isUUID(id)) return;
    await api.delete(`/health-records/${id}`);
  },
};
