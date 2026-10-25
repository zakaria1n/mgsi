import { supabase } from './supabase';
import { offlineCache } from './cache';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
    return 'http://10.0.2.2:5000/api'; // Android Emulator default host mapping
  }
  return '/api';
};

export const apiClient = {
  async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      // Default demo user fallback ID if not logged in
      headers['x-user-id'] = 'bb422935-714e-4ff2-8b7a-0e7f8ccc7c1b';
    }

    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur réseau inconnue' }));
      throw new Error(err.error || err.message || `Erreur HTTP ${response.status}`);
    }

    return response.json();
  },

  // Auth & Profile
  getProfile: () => apiClient.fetchWithAuth('/auth/profile'),
  updateProfile: (data: any) => apiClient.fetchWithAuth('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Stats / Dashboard
  getDashboardStats: async () => {
    try {
      const data = await apiClient.fetchWithAuth('/stats/dashboard');
      offlineCache.set('dashboard_stats', data);
      return data;
    } catch (err) {
      const cached = offlineCache.get('dashboard_stats');
      if (cached) return cached;
      throw err;
    }
  },
  getSubjects: () => apiClient.fetchWithAuth('/stats/subjects'),
  createSubject: (data: { name: string; code?: string; color?: string }) =>
    apiClient.fetchWithAuth('/stats/subjects', { method: 'POST', body: JSON.stringify(data) }),

  // Tasks
  getTasks: async () => {
    try {
      const data = await apiClient.fetchWithAuth('/tasks');
      offlineCache.set('tasks', data);
      return data;
    } catch (err) {
      const cached = offlineCache.get('tasks');
      if (cached) return cached;
      throw err;
    }
  },
  createTask: (data: any) => apiClient.fetchWithAuth('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => apiClient.fetchWithAuth(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => apiClient.fetchWithAuth(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id: string) => apiClient.fetchWithAuth(`/tasks/${id}/complete`, { method: 'POST' }),
  getTaskSplitPreview: (id: string) => apiClient.fetchWithAuth(`/tasks/${id}/split-preview`),

  // Schedule
  getSchedule: async (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const key = `schedule_${start || ''}_${end || ''}`;
    try {
      const data = await apiClient.fetchWithAuth(`/schedule?${params.toString()}`);
      offlineCache.set(key, data);
      offlineCache.set('schedule_latest', data);
      return data;
    } catch (err) {
      const cached = offlineCache.get(key) || offlineCache.get('schedule_latest');
      if (cached) return cached;
      throw err;
    }
  },
  createEvent: (data: any) => apiClient.fetchWithAuth('/schedule', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => apiClient.fetchWithAuth(`/schedule/${id}`, { method: 'DELETE' }),
  getFreeSlots: (date?: string) => apiClient.fetchWithAuth(`/schedule/free-slots?date=${date || ''}`),
  organizeSchedule: (daysAhead = 7) => apiClient.fetchWithAuth('/schedule/organize', { method: 'POST', body: JSON.stringify({ daysAhead }) }),

  // Focus Chrono
  getFocusHistory: () => apiClient.fetchWithAuth('/focus/history'),
  completeFocusSession: (data: any) => apiClient.fetchWithAuth('/focus/complete', { method: 'POST', body: JSON.stringify(data) }),

  // Exams
  getExams: () => apiClient.fetchWithAuth('/exams'),
  createExam: (data: any) => apiClient.fetchWithAuth('/exams', { method: 'POST', body: JSON.stringify(data) }),
  generateExamRevision: (id: string) => apiClient.fetchWithAuth(`/exams/${id}/generate-revision`, { method: 'POST' }),

  // AI
  getAIHistory: () => apiClient.fetchWithAuth('/ai/history'),
  sendAIMessage: (message: string) => apiClient.fetchWithAuth('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  clearAIHistory: () => apiClient.fetchWithAuth('/ai/history', { method: 'DELETE' }),

  // Notifications
  getNotifications: () => apiClient.fetchWithAuth('/notifications'),
  markNotificationRead: (id: string) => apiClient.fetchWithAuth(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiClient.fetchWithAuth('/notifications/read-all', { method: 'POST' }),

  // Module Documents & Study Notes
  getDocuments: async (subjectId?: string, docType?: string) => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (docType) params.append('doc_type', docType);
    return apiClient.fetchWithAuth(`/documents?${params.toString()}`);
  },
  getDocument: (id: string) => apiClient.fetchWithAuth(`/documents/${id}`),
  createDocument: (data: any) => apiClient.fetchWithAuth('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => apiClient.fetchWithAuth(`/documents/${id}`, { method: 'DELETE' }),
  getDocumentNotes: (id: string) => apiClient.fetchWithAuth(`/documents/${id}/notes`),
  savePageNote: (documentId: string, data: any) =>
    apiClient.fetchWithAuth(`/documents/${documentId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  deletePageNote: (documentId: string, page: number) =>
    apiClient.fetchWithAuth(`/documents/${documentId}/notes/${page}`, { method: 'DELETE' }),

  // Local Audio Storage & Migration
  uploadLocalAudio: (data: { audio_base64: string; document_id?: string; page_number?: number; filename?: string }) =>
    apiClient.fetchWithAuth('/documents/audio/upload-local', { method: 'POST', body: JSON.stringify(data) }),
  migrateAudiosToLocal: () =>
    apiClient.fetchWithAuth('/documents/audio/migrate-to-local', { method: 'POST' }),
  getAudioStorageStats: () =>
    apiClient.fetchWithAuth('/documents/audio/stats'),
};
