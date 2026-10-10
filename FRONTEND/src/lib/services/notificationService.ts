import api from '../api';
import type { Notification } from '../../types';

export const notificationService = {
  getNotifications: async (status?: string, type?: string): Promise<Notification[]> => {
    const params: Record<string, any> = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const res = await api.get<Notification[]>('/notifications', { params });
    return res.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const res = await api.patch<Notification>(`/notifications/${id}/read`);
    return res.data;
  },
};
