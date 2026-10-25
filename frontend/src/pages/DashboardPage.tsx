import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Flame,
  GraduationCap,
  Play,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Task, CalendarEvent, Exam } from '../types';
import { getModuleTheme, getEventTypeBadge, triggerHaptic } from '../lib/modules';
import { useDialog } from '../context/DialogContext';

interface DashboardPageProps {
  onStartChronoForTask: (task: Task) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartChronoForTask,
  onNavigateTab,
}) => {
  const { profile } = useAuth();
  const { toast } = useDialog();
  const [loading, setLoading] = useState(true);
  const [nextClass, setNextClass] = useState<CalendarEvent | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<CalendarEvent[]>([]);
  const [priorities, setPriorities] = useState<Task[]>([]);
  const [nextExam, setNextExam] = useState<Exam | null>(null);
  const [focusMinutesThisWeek, setFocusMinutesThisWeek] = useState(0);
  const [organizing, setOrganizing] = useState(false);

  const loadData = async () => {
    try {
      const [data, schedRes] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getSchedule(),
      ]);
      setNextClass(data.nextClass);
      setTodayEvents(data.todayEvents || []);
      setWeekSchedule(schedRes.events || []);
      setPriorities(data.todayPriorities || []);
      setNextExam(data.nextExam);
      setFocusMinutesThisWeek(data.totalFocusMinutesThisWeek || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickOrganize = async () => {
    setOrganizing(true);
    triggerHaptic('medium');
    try {
      await apiClient.organizeSchedule(7);
      await loadData();
      triggerHaptic('heavy');
      toast.success('Les séances ont été intégrées dans votre calendrier.', 'Planification intelligente réussie !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de planification');
    } finally {
      setOrganizing(false);
    }
  };

  const todayStudySessions = todayEvents.filter((e) => e.event_type === 'study_session');

  // Dynamic greeting based on current hour
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const nextClassTheme = nextClass ? getModuleTheme(nextClass.title) : null;
  const nextClassType = nextClass ? getEventTypeBadge(nextClass.event_type) : null;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Editorial Cockpit Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Session d'Automne 2026 — Semestre S3 MGSI</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-bold">Groupe TP {profile?.tp_group || 'G1'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {profile?.full_name || 'Étudiant Ingénieur'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
              Voici votre cockpit académique en temps réel. Votre planning respecte vos enseignements ENSIA-SD, vos travaux pratiques et optimise vos révisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('timetable')}
              className="flex items-center space-x-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-bold px-4 py-3 border border-slate-200/80 shadow-xs transition-all active:scale-[0.98]"
            >
              <BookOpen className="h-4 w-4 text-slate-500" />
              <span>Emploi du temps</span>
            </button>
            <button
              onClick={handleQuickOrganize}
              disabled={organizing}
              className="flex items-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-3 shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-indigo-400 stroke-[2]" />
              <span>{organizing ? 'Calcul du planning...' : 'Organiser ma semaine'}</span>
            </button>
          </div>
        </div>

        {/* Today's Sequence Strip */}
        {todayEvents.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                Déroulé de la journée ({todayEvents.length} séances)
              </span>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                Voir la vue heure par heure
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {todayEvents.map((ev) => {
                const theme = getModuleTheme(ev.title);
                const badge = getEventTypeBadge(ev.event_type);
                return (
                  <div
                    key={ev.id}
                    className={`flex items-center space-x-2.5 rounded-2xl border px-3.5 py-2 shrink-0 ${theme.bgLight} ${theme.border} transition-all hover:scale-[1.01]`}
                  >
                    <div className={`h-2 w-2 rounded-full ${theme.dotColor}`} />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900">{theme.shortName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {new Date(ev.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {ev.room || 'ENSIA-SD'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 7-Day Workload Heatmap */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-indigo-600 stroke-[2]" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Densité Hebdomadaire & Charge d'Étude (7 Jours)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Cliquez sur un jour pour ouvrir le planning
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {(() => {
            const now = new Date();
            const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
            return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const d = addDays(currentWeekStart, offset);
              const dayEvents = weekSchedule.filter((ev) => isSameDay(parseISO(ev.start_time), d));
              const totalMins = dayEvents.reduce((acc, ev) => {
                const start = parseISO(ev.start_time).getTime();
                const end = parseISO(ev.end_time).getTime();
                return acc + Math.max(15, Math.round((end - start) / (60 * 1000)));
              }, 0);
              const hours = Math.round((totalMins / 60) * 10) / 10;
              const isToday = isSameDay(d, now);

              let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
              let barFill = 'bg-slate-400';
              if (hours > 5.5) {
                statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
                barFill = 'bg-rose-500';
              } else if (hours > 3.5) {
                statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                barFill = 'bg-amber-500';
              } else if (hours > 0) {
                statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                barFill = 'bg-emerald-500';
              }

              return (
                <button
                  key={offset}
                  onClick={() => {
                    triggerHaptic('light');
                    onNavigateTab('calendar');
                  }}
                  className={`rounded-2xl border p-2.5 sm:p-3 text-center transition-all hover:scale-[1.02] flex flex-col justify-between space-y-2 ${
                    isToday ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/20' : 'border-slate-200/90 bg-white'
                  }`}
                >
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 capitalize">
                      {format(d, 'EEE', { locale: fr })}
                    </div>
                    <div className={`text-sm sm:text-base font-black ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                      {format(d, 'd')}
                    </div>
                  </div>

                  <div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-1.5 rounded-full ${barFill}`}
                        style={{ width: `${Math.min(100, Math.round((hours / 8) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-md border block truncate ${statusColor}`}>
                      {hours > 0 ? `${hours}h` : 'Libre'}
                    </span>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Bento Grid 3-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Next Class Banner */}
        <div className={`rounded-2xl border ${nextClassTheme ? nextClassTheme.border : 'border-slate-200'} bg-white p-5 shadow-sm hover:border-slate-300 transition-colors`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
            <span className="flex items-center text-slate-700">
              <Clock className="h-4 w-4 mr-1.5 text-indigo-600 stroke-[1.75]" />
              Prochain cours
            </span>
            {nextClassType && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${nextClassType.bg} ${nextClassType.text} ${nextClassType.border}`}>
                {nextClassType.label}
              </span>
            )}
          </div>
          {nextClass ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {nextClassTheme && <div className={`h-2.5 w-2.5 rounded-full ${nextClassTheme.dotColor}`} />}
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {nextClass.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                {nextClass.room && (
                  <span className="rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200">
                    Salle : <strong className="text-slate-800">{nextClass.room}</strong>
                  </span>
                )}
                {nextClass.professor && (
                  <span className="rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200">
                    {nextClass.professor}
                  </span>
                )}
                <span className="rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 border border-indigo-200 font-mono font-bold">
                  {new Date(nextClass.start_time).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">Aucun cours immédiat programmé aujourd'hui.</p>
          )}
        </div>

        {/* Next Exam Countdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
            <span className="flex items-center text-slate-700">
              <GraduationCap className="h-4 w-4 mr-1.5 text-rose-600 stroke-[1.75]" />
              Prochain Examen
            </span>
            {nextExam && (
              <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                {nextExam.importance}
              </span>
            )}
          </div>
          {nextExam ? (
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {nextExam.title}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {new Date(nextExam.exam_date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <button
                onClick={() => onNavigateTab('exams')}
                className="pt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center group"
              >
                Voir la préparation progressive
                <ChevronRight className="h-3.5 w-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">Aucun examen programmé prochainement.</p>
          )}
        </div>

        {/* Weekly Focus Time Meter */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
            <span className="flex items-center text-slate-700">
              <Flame className="h-4 w-4 mr-1.5 text-amber-500 stroke-[1.75]" />
              Temps Focus cette semaine
            </span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              {Math.round(focusMinutesThisWeek / 60 * 10) / 10}h
            </span>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {focusMinutesThisWeek}
              </span>
              <span className="text-xs font-medium text-slate-500">minutes accomplies</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200/60">
              <div
                className="bg-slate-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((focusMinutesThisWeek / 600) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              Chaque minute enregistrée affine vos durées prédictives.
            </p>
          </div>
        </div>
      </div>

      {/* Main Split: Today's Priorities + Today's Recommended Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Priorities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2 text-rose-600 stroke-[1.75]" />
                Priorités du moment
              </h3>
              <p className="text-xs text-slate-500">Calculées selon l'urgence, la difficulté et l'échéance</p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {priorities.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Aucun devoir urgent en attente.
              </div>
            ) : (
              priorities.map((task) => {
                const modTheme = getModuleTheme(task.subject?.code || task.title);
                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-white hover:border-slate-300 p-4 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${modTheme.badgeBg} ${modTheme.badgeText} border ${modTheme.border}`}
                        >
                          {task.subject?.code || modTheme.code}
                        </span>
                        <span className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {task.task_type}
                        </span>
                        {task.priority === 'urgent' && (
                          <span className="rounded-md bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.2">
                            Urgent
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{task.title}</h4>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                        <span>Durée : {task.estimated_duration_minutes} min</span>
                        <span>Échéance : {new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartChronoForTask(task)}
                      className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 shadow-sm transition-all active:scale-95 flex-shrink-0"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Faire maintenant</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Today's Recommended Study Schedule */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-600 stroke-[1.75]" />
                Séances d'études recommandées aujourd'hui
              </h3>
              <p className="text-xs text-slate-500">Positionnées sur vos créneaux libres sans fatigue excessive</p>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Calendrier complet
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {todayStudySessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-3 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Aucune séance d'étude n'a encore été planifiée pour aujourd'hui.
                </p>
                <button
                  onClick={handleQuickOrganize}
                  disabled={organizing}
                  className="rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold px-4 py-2 border border-slate-200 shadow-sm transition-colors"
                >
                  Générer le planning intelligent
                </button>
              </div>
            ) : (
              todayStudySessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-indigo-100 px-3 py-1.5 text-indigo-700 font-mono text-xs font-bold shadow-xs">
                      <span>{new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] text-slate-400">à</span>
                      <span>{new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{session.title}</h4>
                      <span className="text-xs text-indigo-600 font-medium">Séance ciblée d'assimilation</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onStartChronoForTask({
                        id: session.id,
                        user_id: '',
                        title: session.title,
                        task_type: 'revision',
                        deadline: session.end_time,
                        estimated_duration_minutes: 45,
                        actual_duration_minutes: 0,
                        priority: 'high',
                        difficulty: 3,
                        status: 'in_progress',
                        created_at: new Date().toISOString(),
                      });
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 shadow-xs transition-all active:scale-95"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Lancer</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
