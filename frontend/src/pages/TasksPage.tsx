import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Play,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  Layers,
  List,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Circle,
  X,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { Task, Subject, TaskStatus } from '../types';
import { TaskModal } from '../components/TaskModal';
import { getModuleTheme, triggerHaptic, MODULE_THEMES } from '../lib/modules';
import { triggerConfetti } from '../lib/confetti';
import { useDialog } from '../context/DialogContext';

interface TasksPageProps {
  onStartChronoForTask: (task: Task) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ onStartChronoForTask }) => {
  const { confirm: confirmDialog, toast } = useDialog();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'urgent' | 'today' | 'week' | string>('all');
  const [splitPreview, setSplitPreview] = useState<{ taskId: string; plan: any } | null>(null);

  const loadData = async () => {
    try {
      const [tasksRes, subjRes] = await Promise.all([
        apiClient.getTasks(),
        apiClient.getSubjects(),
      ]);
      setTasks(tasksRes.tasks || []);
      setSubjects(subjRes.subjects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    triggerHaptic('medium');
    try {
      if (currentStatus === 'completed') {
        await apiClient.updateTask(taskId, { status: 'todo', completed_at: null });
      } else {
        await apiClient.completeTask(taskId);
        triggerConfetti();
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    triggerHaptic('medium');
    try {
      if (newStatus === 'completed') {
        await apiClient.completeTask(taskId);
        triggerConfetti();
      } else {
        await apiClient.updateTask(taskId, { status: newStatus, completed_at: null });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de mise à jour');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer cette tâche ?',
      message: 'Cette action retirera définitivement cette tâche de votre liste de devoirs et de votre calendrier.',
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      type: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    triggerHaptic('medium');
    try {
      await apiClient.deleteTask(taskId);
      await loadData();
      toast.success('Tâche supprimée avec succès.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleViewSplit = async (task: Task) => {
    try {
      const res = await apiClient.getTaskSplitPreview(task.id);
      setSplitPreview({ taskId: task.id, plan: res });
      triggerHaptic('light');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de charger le découpage');
    }
  };

  const matchesTimeAndModule = (t: Task) => {
    if (timeFilter === 'urgent') return t.priority === 'urgent';
    if (timeFilter === 'today') {
      const taskDate = new Date(t.deadline);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    }
    if (timeFilter === 'week') {
      const diffDays = (new Date(t.deadline).getTime() - Date.now()) / (1000 * 3600 * 24);
      return diffDays >= -0.5 && diffDays <= 7;
    }
    if (timeFilter.startsWith('mod_')) {
      const code = timeFilter.replace('mod_', '').toUpperCase();
      return (t.subject?.code || '').toUpperCase().includes(code) || t.title.toUpperCase().includes(code);
    }
    return true;
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'todo' && t.status === 'completed') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    return matchesTimeAndModule(t);
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Kanban column buckets filtered by time/module
  const kanbanFiltered = tasks.filter(matchesTimeAndModule);
  const todoTasks = kanbanFiltered.filter((t) => !t.status || t.status === 'todo');
  const inProgressTasks = kanbanFiltered.filter((t) => t.status === 'in_progress');
  const completedTasks = kanbanFiltered.filter((t) => t.status === 'completed');

  const kanbanColumns: { id: TaskStatus; title: string; tasks: Task[]; badgeColor: string }[] = [
    {
      id: 'todo',
      title: 'À faire',
      tasks: todoTasks,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      id: 'in_progress',
      title: 'En cours',
      tasks: inProgressTasks,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'completed',
      title: 'Terminé',
      tasks: completedTasks,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center">
            <CheckSquare className="h-6 w-6 mr-2 text-indigo-600 stroke-[1.75]" />
            Devoirs, Projets & Tâches
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Gestion de charge académique MGSI, découpage intelligent et suivi par statut.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: List vs Kanban */}
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('list');
              }}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Liste</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('kanban');
              }}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Filter (List view only) */}
          {viewMode === 'list' && (
            <div className="hidden sm:flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
              {(['all', 'todo', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    triggerHaptic('light');
                    setStatusFilter(s);
                  }}
                  className={`rounded-lg px-3 py-1 font-bold transition-all capitalize ${
                    statusFilter === s
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'all' ? 'Toutes' : s === 'todo' ? 'À faire' : 'Terminées'}
                </button>
              ))}
            </div>
          )}

          {/* New Task Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau devoir</span>
          </button>
        </div>
      </div>

      {/* Temporal & Module Filter Pills (Things 3 style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'urgent', label: '🔥 Urgents' },
          { id: 'today', label: '📅 Aujourd\'hui' },
          { id: 'week', label: '🗓️ Cette semaine' },
          { id: 'mod_M234', label: 'ERP (M234)' },
          { id: 'mod_M232', label: 'Projet & GL (M232)' },
          { id: 'mod_M233', label: 'BD Avancées (M233)' },
          { id: 'mod_M235', label: 'Audit SI (M235)' },
          { id: 'mod_M236', label: 'Syst. Distribués (M236)' },
          { id: 'mod_M237', label: 'Transf. Digitale (M237)' },
        ].map((f) => {
          const isSelected = timeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                triggerHaptic('light');
                setTimeFilter(f.id);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: CLASSIC LIST / GRID VIEW */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm bg-white">
              Aucun devoir ou projet ne correspond aux filtres.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const modTheme = getModuleTheme(task.subject?.code || task.title);

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 bg-white shadow-xs hover:border-slate-300 ${
                    isCompleted ? 'opacity-65 border-slate-200 bg-slate-50/50' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${modTheme.badgeBg} ${modTheme.badgeText} ${modTheme.border}`}
                        >
                          {task.subject?.code || modTheme.code}
                        </span>
                        {task.task_type && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                            {task.task_type}
                          </span>
                        )}
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors rounded-lg hover:bg-slate-100"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.75]" />
                      </button>
                    </div>

                    <h3 className={`text-base font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 font-medium">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-slate-500">
                          <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          Durée estimée :
                        </span>
                        <span className="font-bold text-slate-800">{task.estimated_duration_minutes} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Temps réel passé :</span>
                        <span className="font-bold text-indigo-600">{task.actual_duration_minutes || 0} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Échéance :</span>
                        <span className="font-bold text-amber-700">
                          {new Date(task.deadline).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleComplete(task.id, task.status)}
                        className={`flex items-center space-x-1 text-xs font-bold rounded-xl px-2.5 py-1.5 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isCompleted ? 'Fait' : 'Marquer fait'}</span>
                      </button>

                      {task.estimated_duration_minutes > 50 && (
                        <button
                          onClick={() => handleViewSplit(task)}
                          title="Voir le découpage en séances par l'IA"
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {!isCompleted && (
                      <button
                        onClick={() => onStartChronoForTask(task)}
                        className="flex items-center space-x-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Chrono</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {kanbanColumns.map((col) => {
            const totalMinutes = col.tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);
            return (
              <div
                key={col.id}
                className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-4 space-y-3.5 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200/60">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-slate-900">{col.title}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                      {col.tasks.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {Math.round(totalMinutes / 60 * 10) / 10}h
                  </span>
                </div>

                {/* Cards List in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-0.5">
                  {col.tasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      Aucun devoir dans cette colonne
                    </div>
                  ) : (
                    col.tasks.map((task) => {
                      const modTheme = getModuleTheme(task.subject?.code || task.title);
                      const isOverdue = new Date(task.deadline).getTime() < Date.now() && task.status !== 'completed';

                      return (
                        <div
                          key={task.id}
                          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                        >
                          {/* Top Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${modTheme.badgeBg} ${modTheme.badgeText} ${modTheme.border}`}
                              >
                                {task.subject?.code || modTheme.code}
                              </span>
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadge(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {task.title}
                          </h4>

                          {/* Timing metadata */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {task.estimated_duration_minutes} min
                            </span>
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                              {new Date(task.deadline).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>

                          {/* Quick Transitions & Actions */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                            {/* Move backwards */}
                            {col.id !== 'todo' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, col.id === 'completed' ? 'in_progress' : 'todo')}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                title="Déplacer vers la colonne précédente"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Chrono Focus CTA */}
                            {col.id !== 'completed' && (
                              <button
                                onClick={() => onStartChronoForTask(task)}
                                className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-2.5 shadow-xs transition-all active:scale-95"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Chrono</span>
                              </button>
                            )}

                            {/* Move forward */}
                            {col.id !== 'completed' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, col.id === 'todo' ? 'in_progress' : 'completed')}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors ml-auto"
                                title="Passer à l'étape suivante"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Splitting Breakdown Modal */}
      {splitPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Découpage ergonomique par l'IA</h3>
              </div>
              <button
                onClick={() => setSplitPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Pour éviter l'épuisement mental et garantir une assimilation progressive, cette tâche de <strong>{splitPreview.plan.adjustedDurationMinutes} min</strong> a été fractionnée en séances espacées :
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {splitPreview.plan.sessionsPlan.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      Étape {s.order} • Jour J+{s.preferredDayOffset}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                  </div>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 border border-indigo-200 shadow-2xs">
                    {s.plannedMinutes} min
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSplitPreview(null)}
              className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 border border-slate-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subjects={subjects}
        onTaskCreated={loadData}
      />
    </div>
  );
};
