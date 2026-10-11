import api from '../api';
import { supabase } from '../supabase';
import type { Notification } from '../../types';

export const notificationService = {
  getNotifications: async (status?: string, type?: string): Promise<Notification[]> => {
    // 1. Direct Supabase Query (ultra-fast, ~50ms)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);

        const { data, error } = await query;
        if (!error && data) {
          return data as Notification[];
        }
      }
    } catch {}

    // 2. Backend API fallback
    try {
      const params: Record<string, any> = {};
      if (status) params.status = status;
      if (type) params.type = type;
      const res = await api.get<Notification[]>('/notifications', { params });
      return res.data || [];
    } catch {
      return [];
    }
  },

  markAsRead: async (id: string): Promise<Notification> => {
    try {
      const res = await api.patch<Notification>(`/notifications/${id}/read`);
      return res.data;
    } catch (backendError) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ status: 'READ' })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as Notification;
      } catch {}
      throw backendError;
    }
  },
};
