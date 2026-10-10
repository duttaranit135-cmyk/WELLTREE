import api from '../api';
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
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (isActive !== undefined) params.is_active = isActive;
    const res = await api.get<EmergencyContact[]>('/emergency-contacts', { params });
    return res.data;
  },

  createContact: async (data: EmergencyContactCreate): Promise<EmergencyContact> => {
    const res = await api.post<EmergencyContact>('/emergency-contacts', data);
    return res.data;
  },

  updateContact: async (id: string, data: Partial<EmergencyContactCreate>): Promise<EmergencyContact> => {
    const res = await api.put<EmergencyContact>(`/emergency-contacts/${id}`, data);
    return res.data;
  },

  deleteContact: async (id: string): Promise<void> => {
    await api.delete(`/emergency-contacts/${id}`);
  },

  // SOS Events
  triggerSOS: async (data: SOSEventCreate): Promise<EmergencySOS> => {
    const res = await api.post<EmergencySOS>('/emergency/sos', data);
    return res.data;
  },

  getSOSHistory: async (familyMemberId?: string, status?: string): Promise<EmergencySOS[]> => {
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (status) params.status = status;
    const res = await api.get<EmergencySOS[]>('/emergency/sos/history', { params });
    return res.data;
  },

  updateSOSStatus: async (id: string, status: SOSEventStatus, notes?: string): Promise<EmergencySOS> => {
    const res = await api.patch<EmergencySOS>(`/emergency/sos/${id}/status`, { status, notes });
    return res.data;
  },
};
