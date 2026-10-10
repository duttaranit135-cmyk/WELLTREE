import React, { useState } from 'react';
import { Bell, AlertTriangle, Pill, Shield, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationType } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'UNREAD') return n.status === 'UNREAD';
    return n.type === filterType;
  });

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'EMERGENCY_SOS':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'CRITICAL_HEALTH_ALERT':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'MEDICINE_REMINDER':
        return <Pill className="w-5 h-5 text-teal-600" />;
      case 'CONSENT_REQUEST':
        return <Shield className="w-5 h-5 text-cyan-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'EMERGENCY_SOS':
        return <Badge variant="red">EMERGENCY SOS</Badge>;
      case 'CRITICAL_HEALTH_ALERT':
        return <Badge variant="amber">CRITICAL HEALTH</Badge>;
      case 'MEDICINE_REMINDER':
        return <Badge variant="teal">MEDICINE</Badge>;
      case 'CONSENT_REQUEST':
        return <Badge variant="indigo">CONSENT</Badge>;
      default:
        return <Badge variant="gray">SYSTEM</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Bell className="w-4 h-4" />
            <span>Alerts & Real-Time Dispatch</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Notification Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Stay informed with critical health alerts, medication reminders, and guardian broadcasts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => {
              markAllAsRead();
              toast.success('All notifications marked as read');
            }}
            variant="outline"
            className="border-slate-200 text-slate-700 self-start md:self-auto"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { label: 'All Alerts', value: 'ALL' },
          { label: 'Unread Only', value: 'UNREAD' },
          { label: 'Emergency SOS', value: 'EMERGENCY_SOS' },
          { label: 'Critical Health', value: 'CRITICAL_HEALTH_ALERT' },
          { label: 'Medications', value: 'MEDICINE_REMINDER' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === tab.value
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={Bell}
            title="No notifications in this category"
            description="You're all caught up! No pending alerts or emergency broadcasts."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const isUnread = n.status === 'UNREAD';
            return (
              <Card
                key={n.id}
                className={`p-5 transition-all shadow-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-teal-50/20 border-teal-200/80 shadow-teal-500/5'
                    : 'bg-white border-slate-200/80 opacity-90'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                      {getTypeBadge(n.type)}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <span className="text-2xs text-slate-400 block pt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isUnread && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsRead(n.id)}
                    className="text-teal-700 hover:bg-teal-100/60 text-xs self-end sm:self-center"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Mark Read
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
