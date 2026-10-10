import api from '../api';
import type { MedicalReport } from '../../types';

export const medicalReportService = {
  getReports: async (familyMemberId?: string, reportType?: string): Promise<MedicalReport[]> => {
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (reportType) params.report_type = reportType;
    const res = await api.get<MedicalReport[]>('/medical-reports', { params });
    return res.data;
  },

  getReportById: async (id: string): Promise<MedicalReport> => {
    const res = await api.get<MedicalReport>(`/medical-reports/${id}`);
    return res.data;
  },

  uploadReport: async (formData: FormData): Promise<MedicalReport> => {
    const res = await api.post<MedicalReport>('/medical-reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/medical-reports/${id}`);
  },
};
