import React, { useState, useEffect } from 'react';
import { Bell, Search, FileText, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { SmartNotification } from '../types';

export const Navbar: React.FC<{
  onOpenNotifications: () => void;
  onOpenCommandPalette: () => void;
  onOpenScratchpad: () => void;
}> = ({ onOpenNotifications, onOpenCommandPalette, onOpenScratchpad }) => {
  const { profile, user, updateProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    apiClient.getNotifications().then((res) => {
      const unread = (res.notifications || []).filter((n: SmartNotification) => !n.is_read).length;
      setUnreadCount(unread);
    }).catch(() => {});
  }, []);

  const toggleGroup = () => {
    const nextGroup = profile?.tp_group === 'G1' ? 'G2' : 'G1';
    updateProfile({ tp_group: nextGroup });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-4 py-3 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center space-x-3">
        <img
          src="/logo.png"
          alt="MGSI Logo"
          className="h-10 w-10 rounded-xl object-contain shadow-xs border border-slate-200/80 bg-white p-0.5"
        />
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center">
              MGSI Planner
              <span className="ml-2 hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
                ENSIA-SD Taroudant
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block font-medium">
            Semestre 3 — Session d'Automne 2026-2027
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Sync Status Badge */}
        <div
          className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
              : 'bg-amber-50 text-amber-700 border-amber-200/70'
          }`}
          title={isOnline ? 'Toutes les données sont synchronisées' : 'Mode hors-ligne — Données chargées depuis le cache local'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'Synchronisé' : 'Hors-ligne'}</span>
        </div>

        {/* Scratchpad Quick Notes button */}
        <button
          onClick={onOpenScratchpad}
          className="flex items-center space-x-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-2xs"
          title="Scratchpad Amphi & Notes Rapides (Ctrl + J)"
        >
          <FileText className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden sm:inline">Notes</span>
        </button>

        {/* Quick Search / Command Palette button */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center space-x-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 px-3 py-1.5 text-xs text-slate-500 transition-all shadow-xs hover:text-slate-800"
          title="Recherche rapide (Ctrl + K)"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">Rechercher...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={onOpenCommandPalette}
          className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors"
          title="Recherche rapide"
        >
          <Search className="h-5 w-5 stroke-[1.75]" />
        </button>

        {/* TP Group Switcher */}
        <button
          onClick={toggleGroup}
          title="Cliquez pour basculer entre Groupe 1 et Groupe 2 de TP"
          className="flex items-center space-x-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm"
        >
          <span className="text-slate-500 font-normal">Groupe TP :</span>
          <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">
            {profile?.tp_group || 'G1'}
          </span>
        </button>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors"
          title="Notifications intelligentes"
        >
          <Bell className="h-5 w-5 stroke-[1.75]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User profile capsule */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <span className="hidden md:inline text-xs font-semibold text-slate-800 max-w-[130px] truncate">
            {profile?.full_name || user?.email?.split('@')[0] || 'Étudiant MGSI'}
          </span>
        </div>
      </div>
    </header>
  );
};
