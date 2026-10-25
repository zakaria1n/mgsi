/**
 * Offline-First local caching utility
 * Keeps calendar events, tasks, and dashboard stats instantly available offline
 */

export interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export const offlineCache = {
  set: <T>(key: string, data: T) => {
    try {
      const entry: CacheEntry<T> = {
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(`mgsi_cache_${key}`, JSON.stringify(entry));
      localStorage.setItem('mgsi_last_sync', new Date().toISOString());
    } catch {
      // Quota exceeded or private browsing
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(`mgsi_cache_${key}`);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      return parsed.data;
    } catch {
      return null;
    }
  },

  getLastSync: (): string | null => {
    return localStorage.getItem('mgsi_last_sync');
  },
};
