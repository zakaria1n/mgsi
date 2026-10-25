import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Timer,
  Sparkles,
  User,
  Folder,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenChrono: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenChrono }) => {
  const items = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'modules', label: 'Modules', icon: Folder },
    { id: 'tasks', label: 'Devoirs', icon: CheckSquare },
    { id: 'ai', label: 'IA Copilot', icon: Sparkles },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="h-5 w-5 stroke-[1.75] mb-0.5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}

      {/* Quick Chrono launch */}
      <button
        onClick={onOpenChrono}
        className="flex flex-col items-center justify-center p-1 text-indigo-700 hover:text-indigo-800"
      >
        <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-0.5 shadow-sm">
          <Timer className="h-4 w-4 text-indigo-600 stroke-[2]" />
        </div>
        <span className="text-[10px] font-bold">Chrono</span>
      </button>
    </div>
  );
};
