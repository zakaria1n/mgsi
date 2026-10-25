import React from 'react';
import { X, CheckCheck, AlertTriangle, Clock, GraduationCap, Info } from 'lucide-react';
import { SmartNotification } from '../types';
import { apiClient } from '../lib/api';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SmartNotification[];
  onRefresh: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await apiClient.markAllNotificationsRead();
    onRefresh();
  };

  const handleMarkRead = async (id: string) => {
    await apiClient.markNotificationRead(id);
    onRefresh();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline_warning':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'overdue_alert':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case 'exam_prep':
        return <GraduationCap className="h-4 w-4 text-indigo-400" />;
      default:
        return <Info className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[85vh] rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Notifications contextuelles</h2>
            <p className="text-xs text-slate-500">Rappels intelligents basés sur vos échéances et avancements</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"
              title="Tout marquer comme lu"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Tout lire
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto space-y-3 py-4 flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Toutes vos alertes sont à jour. Bon travail !
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'bg-slate-50/60 border-slate-100 opacity-60'
                    : 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">{getIcon(n.notification_type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                      {new Date(n.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
