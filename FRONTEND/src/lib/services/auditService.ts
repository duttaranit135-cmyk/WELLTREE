import api from '../api';
import type { AuditLog } from '../../types';

export const auditService = {
  getLogs: async (familyId?: string, limit = 50): Promise<AuditLog[]> => {
    const params: Record<string, any> = { limit };
    if (familyId) params.family_id = familyId;
    const res = await api.get<AuditLog[]>('/audit-logs', { params });
    return res.data;
  },
};
