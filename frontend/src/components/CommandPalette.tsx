import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  CheckSquare,
  GraduationCap,
  Sparkles,
  Play,
  Download,
  Users,
  Clock,
  Layers,
  TableProperties,
  User,
  ArrowRight,
  X,
  MapPin,
  Printer,
  FileText,
  Folder,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { exportCalendarToICS, getModuleTheme, triggerHaptic, MODULE_THEMES } from '../lib/modules';
import { useDialog } from '../context/DialogContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenChrono: () => void;
  onOpenScratchpad?: () => void;
}

interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions' | 'Modules ENSIA-SD' | 'Salles & Amphis';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenChrono,
  onOpenScratchpad,
}) => {
  const { toast } = useDialog();
  const { profile, updateProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global hotkey listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          triggerHaptic('light');
          // Parent or state toggle
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleGroup = async () => {
    const nextGroup = profile?.tp_group === 'G1' ? 'G2' : 'G1';
    await updateProfile({ tp_group: nextGroup });
    triggerHaptic('medium');
    onClose();
  };

  const handleExportICS = async () => {
    try {
      const res = await apiClient.getSchedule();
      exportCalendarToICS(res.events || []);
      toast.success('Calendrier exporté au format .ics !');
      triggerHaptic('medium');
      onClose();
    } catch {
      toast.error("Erreur lors de l'export du calendrier");
    }
  };

  // Base list of commands
  const allCommands: CommandItem[] = [
    // Pages
    {
      id: 'nav-dashboard',
      category: 'Pages',
      title: "Tableau de Bord Cockpit",
      subtitle: "Vue d'ensemble en temps réel et briefing du jour",
      icon: <Layers className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-calendar',
      category: 'Pages',
      title: 'Planning & Calendrier Interactif',
      subtitle: 'Semaine, mois, indicateur en direct et séances IA',
      icon: <Calendar className="h-4 w-4 text-emerald-600" />,
      action: () => {
        onNavigateTab('calendar');
        onClose();
      },
    },
    {
      id: 'nav-tasks',
      category: 'Pages',
      title: 'Devoirs & Projets (Vue Liste & Kanban)',
      subtitle: 'Suivi de la charge de travail et urgences',
      icon: <CheckSquare className="h-4 w-4 text-purple-600" />,
      action: () => {
        onNavigateTab('tasks');
        onClose();
      },
    },
    {
      id: 'nav-exams',
      category: 'Pages',
      title: 'Contrôles & Examens',
      subtitle: 'Comptes à rebours et suivi des révisions',
      icon: <GraduationCap className="h-4 w-4 text-rose-600" />,
      action: () => {
        onNavigateTab('exams');
        onClose();
      },
    },
    {
      id: 'nav-modules',
      category: 'Pages',
      title: "Modules & Espaces d'Étude (PDF)",
      subtitle: "Cours, TD, TP et lecteur PDF avec notes vocales et écrites synchronisées",
      icon: <Folder className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('modules');
        onClose();
      },
    },
    {
      id: 'nav-timetable',
      category: 'Pages',
      title: 'Emploi du Temps Officiel ENSIA-SD',
      subtitle: 'Grille hebdomadaire officielle S3 avec salles et enseignants',
      icon: <TableProperties className="h-4 w-4 text-sky-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'nav-ai',
      category: 'Pages',
      title: 'Assistant IA Copilote MGSI',
      subtitle: 'Discussions multiples, optimisation et conseils académiques',
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      action: () => {
        onNavigateTab('ai');
        onClose();
      },
    },
    {
      id: 'nav-profile',
      category: 'Pages',
      title: 'Mon Profil & Paramètres Rythme',
      subtitle: 'Sommeil, repas, groupe TP et préférences',
      icon: <User className="h-4 w-4 text-slate-600" />,
      action: () => {
        onNavigateTab('profile');
        onClose();
      },
    },

    // Actions
    {
      id: 'act-chrono',
      category: 'Actions',
      title: 'Démarrer un Chrono Focus / Pomodoro',
      subtitle: 'Session de travail chronométrée sans distraction',
      badge: 'Focus',
      icon: <Play className="h-4 w-4 text-indigo-600" />,
      action: () => {
        triggerHaptic('medium');
        onOpenChrono();
        onClose();
      },
    },
    {
      id: 'act-toggle-group',
      category: 'Actions',
      title: `Basculer vers le Groupe TP ${profile?.tp_group === 'G1' ? 'G2' : 'G1'}`,
      subtitle: `Actuellement en ${profile?.tp_group || 'G1'} (ajuste automatiquement la grille)`,
      badge: profile?.tp_group || 'G1',
      icon: <Users className="h-4 w-4 text-blue-600" />,
      action: toggleGroup,
    },
    {
      id: 'act-export-ics',
      category: 'Actions',
      title: 'Exporter le Calendrier (.ics)',
      subtitle: 'Compatible Google Calendar, Apple Calendar, Outlook',
      badge: 'iCal',
      icon: <Download className="h-4 w-4 text-emerald-600" />,
      action: handleExportICS,
    },
    {
      id: 'act-print-week',
      category: 'Actions',
      title: 'Imprimer la Fiche de Semaine (PDF A4)',
      subtitle: 'Version épurée imprimable avec cours et échéances',
      badge: 'PDF',
      icon: <Printer className="h-4 w-4 text-slate-700" />,
      action: () => {
        onClose();
        setTimeout(() => window.print(), 150);
      },
    },
    {
      id: 'act-scratchpad',
      category: 'Actions',
      title: 'Ouvrir le Scratchpad Amphi & Notes',
      subtitle: 'Prendre une note rapide et la convertir en tâche',
      badge: 'Ctrl J',
      icon: <FileText className="h-4 w-4 text-amber-600" />,
      action: () => {
        onClose();
        if (onOpenScratchpad) onOpenScratchpad();
      },
    },

    // Modules
    ...Object.values(MODULE_THEMES).map((m) => ({
      id: `mod-${m.code}`,
      category: 'Modules ENSIA-SD' as const,
      title: `${m.code} - ${m.shortName}`,
      subtitle: `${m.professor || ''} • Salle par défaut : ${m.defaultRoom || 'ENSIA-SD'}`,
      badge: m.code,
      icon: <div className={`h-3 w-3 rounded-full ${m.dotColor}`} />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    })),

    // Salles
    {
      id: 'room-12',
      category: 'Salles & Amphis',
      title: 'Salle 12',
      subtitle: 'Progiciels ERP (M234) — Pr. SAAD Basma',
      icon: <MapPin className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-10',
      category: 'Salles & Amphis',
      title: 'Salle 10',
      subtitle: 'Gestion de projet (TD) • Audit SI • Admin BD Avancées',
      icon: <MapPin className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-6',
      category: 'Salles & Amphis',
      title: 'Salle 6',
      subtitle: 'Systèmes Distribués (M236) — Pr. BOUJERFAOUI Said',
      icon: <MapPin className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-info-2',
      category: 'Salles & Amphis',
      title: 'Salle 2 INFO (Laboratoire Informatique)',
      subtitle: 'TP Audit SI (G1/G2) & TP Admin BD (G1/G2)',
      icon: <MapPin className="h-4 w-4 text-emerald-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-info-4',
      category: 'Salles & Amphis',
      title: 'Salle 4 INFO (Laboratoire Informatique)',
      subtitle: 'TP Génie Logiciel (M232 G1/G2) — Pr. RASSAM Latifa',
      icon: <MapPin className="h-4 w-4 text-emerald-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-info-3',
      category: 'Salles & Amphis',
      title: 'Salle 3 INFO (Laboratoire Informatique)',
      subtitle: 'TP Systèmes Distribués (G1/G2) & TP ERP (G1/G2)',
      icon: <MapPin className="h-4 w-4 text-emerald-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-amphi-1',
      category: 'Salles & Amphis',
      title: 'Amphi 1',
      subtitle: 'Gestion de projet (CM) • Transf. Digitale (CM) • Langue Française (CM)',
      icon: <MapPin className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
    {
      id: 'room-amphi-3',
      category: 'Salles & Amphis',
      title: 'Amphi 3',
      subtitle: 'Langue Anglaise (TD) — Pr. Mohamed EL OUARDI',
      icon: <MapPin className="h-4 w-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('timetable');
        onClose();
      },
    },
  ];

  // Filter commands
  const filtered = query.trim()
    ? allCommands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
          c.category.toLowerCase().includes(q) ||
          (c.badge && c.badge.toLowerCase().includes(q))
        );
      })
    : allCommands;

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-100 bg-white">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher un cours, une salle, un enseignant, une action..."
            className="w-full text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Aucun résultat pour « <span className="font-semibold text-slate-600">{query}</span> »
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected ? 'bg-indigo-50/80 text-indigo-900 shadow-xs' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isSelected ? 'bg-white border-indigo-200 shadow-xs' : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center pl-2 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">
                      {item.category}
                    </span>
                    <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono font-bold text-slate-700">↑</kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono font-bold text-slate-700">↓</kbd>
              <span>pour naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono font-bold text-slate-700">↵</kbd>
              <span>pour sélectionner</span>
            </span>
          </div>
          <span className="font-semibold text-indigo-600 hidden sm:inline">MGSI ENSIA-SD</span>
        </div>
      </div>
    </div>
  );
};
