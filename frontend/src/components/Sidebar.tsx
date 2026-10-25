import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Timer,
  GraduationCap,
  Sparkles,
  User,
  LogOut,
  Folder,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenChrono: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenChrono }) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendrier & Séances', icon: Calendar },
    { id: 'modules', label: 'Modules & Cours (PDF)', icon: Folder, badge: 'Nouveau' },
    { id: 'tasks', label: 'Devoirs & Projets', icon: CheckSquare },
    { id: 'exams', label: 'Examens & Révisions', icon: GraduationCap },
    { id: 'ai', label: 'Assistant IA MGSI', icon: Sparkles, badge: 'Copilote' },
    { id: 'profile', label: 'Profil & Emploi ENSIA-SD', icon: User },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200/80 bg-white/70 backdrop-blur-md p-4 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {/* Quick Do It Now CTA */}
        <button
          onClick={onOpenChrono}
          className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <Timer className="h-4 w-4 text-indigo-400 stroke-[2]" />
          <span className="text-xs tracking-wide">Lancer un Chrono</span>
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 stroke-[1.75] ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200/80 pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="h-4 w-4 stroke-[1.75]" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};
