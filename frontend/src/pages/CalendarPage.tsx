import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  Trash2,
  Clock,
  MapPin,
  User,
  List,
  Grid,
  CalendarDays,
  CalendarRange,
  X,
  CheckCircle2,
  Info,
  Download,
  Printer,
} from 'lucide-react';
import { getModuleTheme, exportCalendarToICS, triggerHaptic } from '../lib/modules';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiClient } from '../lib/api';
import { CalendarEvent, Task, TPGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

interface CalendarPageProps {
  onStartChronoForTask: (task: Task) => void;
}

type ViewMode = 'week' | 'month' | 'day' | 'list';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOUR_HEIGHT = 64; // pixels per hour

export const CalendarPage: React.FC<CalendarPageProps> = ({ onStartChronoForTask }) => {
  const { profile } = useAuth();
  const { confirm: confirmDialog, toast } = useDialog();
  // Default to the official academic start in September 2026
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-09-09T08:00:00.000Z'));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [groupFilter, setGroupFilter] = useState<TPGroup | 'ALL'>((profile?.tp_group as TPGroup) || 'G1');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [organizing, setOrganizing] = useState(false);
  const [jumpDate, setJumpDate] = useState<string>('2026-09-09');
  const [now, setNow] = useState<Date>(new Date());

  // Real-time tick every 30s for the live time indicator line
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.getSchedule();
      setEvents(res.events || []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOrganize = async () => {
    setOrganizing(true);
    triggerHaptic('medium');
    try {
      const res = await apiClient.organizeSchedule(7);
      await fetchEvents();
      triggerHaptic('heavy');
      toast.success(`${res.createdSessions?.length || 0} séances d'études réparties avec succès.`, 'Planification réussie !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la planification');
    } finally {
      setOrganizing(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer cet événement ?',
      message: 'Voulez-vous vraiment retirer cet événement de votre emploi du temps ?',
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      type: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    try {
      await apiClient.deleteEvent(id);
      setSelectedEvent(null);
      await fetchEvents();
      toast.success('Événement supprimé avec succès.');
      triggerHaptic('medium');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  // Sync group filter with profile when loaded
  useEffect(() => {
    if (profile?.tp_group) {
      setGroupFilter(profile.tp_group as TPGroup);
    }
  }, [profile?.tp_group]);

  // Filter events by TP group and event type
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Group filter (keep common CM & TD, filter TP by G1/G2)
      if (groupFilter !== 'ALL') {
        if (e.tp_group && e.tp_group !== groupFilter) return false;
        if (e.title.includes('TP G1') && groupFilter !== 'G1') return false;
        if (e.title.includes('TP G2') && groupFilter !== 'G2') return false;
      }
      // Type filter
      if (typeFilter !== 'ALL') {
        if (e.event_type !== typeFilter) return false;
      }
      return true;
    });
  }, [events, groupFilter, typeFilter]);

  // Week calculation (Monday to Sunday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  // Navigation handlers
  const handlePrev = () => {
    triggerHaptic('light');
    if (viewMode === 'day') setCurrentDate((prev) => subDays(prev, 1));
    else if (viewMode === 'week' || viewMode === 'list') setCurrentDate((prev) => subWeeks(prev, 1));
    else if (viewMode === 'month') setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (viewMode === 'day') setCurrentDate((prev) => addDays(prev, 1));
    else if (viewMode === 'week' || viewMode === 'list') setCurrentDate((prev) => addWeeks(prev, 1));
    else if (viewMode === 'month') setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleJumpToDate = (dStr: string) => {
    if (!dStr) return;
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      setCurrentDate(d);
      setJumpDate(dStr);
      triggerHaptic('light');
    }
  };

  // Badge / Pill styling harmonized with ENSIA-SD modules
  const getEventBadgeStyles = (type: string, title?: string) => {
    const modTheme = title ? getModuleTheme(title) : null;

    if (type === 'exam') {
      return {
        bg: 'bg-rose-50/95 hover:bg-rose-100',
        border: 'border-rose-300',
        text: 'text-rose-950',
        pill: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
      };
    }
    if (type === 'study_session') {
      return {
        bg: 'bg-purple-50/95 hover:bg-purple-100',
        border: 'border-purple-200/90',
        text: 'text-purple-950',
        pill: 'bg-purple-100 text-purple-800 border-purple-200 font-semibold',
      };
    }

    if (modTheme && modTheme.code !== 'GEN') {
      return {
        bg: `${modTheme.bgLight} ${modTheme.bgHover}`,
        border: modTheme.border,
        text: modTheme.text,
        pill: `${modTheme.badgeBg} ${modTheme.badgeText} border ${modTheme.border}`,
      };
    }

    switch (type) {
      case 'CM':
        return {
          bg: 'bg-sky-50/95 hover:bg-sky-100',
          border: 'border-sky-200/90',
          text: 'text-sky-900',
          pill: 'bg-sky-100 text-sky-800 border-sky-200',
        };
      case 'TD':
        return {
          bg: 'bg-amber-50/95 hover:bg-amber-100',
          border: 'border-amber-200/90',
          text: 'text-amber-900',
          pill: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'TP':
        return {
          bg: 'bg-emerald-50/95 hover:bg-emerald-100',
          border: 'border-emerald-200/90',
          text: 'text-emerald-900',
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      default:
        return {
          bg: 'bg-slate-50/95 hover:bg-slate-100',
          border: 'border-slate-200',
          text: 'text-slate-900',
          pill: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  // Compute position on vertical time-grid
  const computeGridPosition = (ev: CalendarEvent) => {
    const start = parseISO(ev.start_time);
    const end = parseISO(ev.end_time);

    const startH = getHours(start);
    const startM = getMinutes(start);
    const endH = getHours(end);
    const endM = getMinutes(end);

    const top = Math.max(0, (startH - 8) * HOUR_HEIGHT + (startM / 60) * HOUR_HEIGHT);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const height = Math.max(34, (durationMinutes / 60) * HOUR_HEIGHT - 2);

    return { top, height };
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
              Emploi officiel ENSIA-SD actif jusqu'au 20 Juin 2027
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-indigo-600 stroke-[1.75]" />
            Calendrier & Séances Académiques
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Grille horaire interactive en temps réel, cours magistraux, travaux pratiques et séances de focus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Group Filter */}
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
            {(['ALL', 'G1', 'G2'] as const).map((grp) => (
              <button
                key={grp}
                onClick={() => setGroupFilter(grp)}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                  groupFilter === grp
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {grp === 'ALL' ? 'Tous' : `TP ${grp}`}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grille hebdomadaire horaire"
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Semaine</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue du mois complet"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Mois</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue chronologique du jour"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Jour</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue liste / agenda"
            >
              <List className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Export iCal (.ics) */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              exportCalendarToICS(filteredEvents);
            }}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 text-xs font-bold px-3 py-2 shadow-xs transition-all active:scale-[0.98]"
            title="Exporter l'emploi du temps (.ics) pour Google Calendar / Apple Calendar"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden sm:inline">Exporter .ics</span>
          </button>

          {/* Print / PDF Sheet */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              window.print();
            }}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 text-xs font-bold px-3 py-2 shadow-xs transition-all active:scale-[0.98]"
            title="Imprimer ou enregistrer en PDF la fiche de la semaine (A4)"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden sm:inline">Imprimer / PDF</span>
          </button>

          {/* Plan with AI CTA */}
          <button
            onClick={handleOrganize}
            disabled={organizing}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-indigo-400 stroke-[2]" />
            <span>{organizing ? 'Calcul...' : 'Planifier avec l\'IA'}</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs">
        {/* Navigation arrows & shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrev}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Quick preset buttons */}
          <button
            onClick={() => setCurrentDate(new Date('2026-09-09T08:00:00.000Z'))}
            className="rounded-xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors"
          >
            Rentrée Sept. 2026
          </button>
          <button
            onClick={() => setCurrentDate(new Date('2027-06-15T08:00:00.000Z'))}
            className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Fin Juin 2027
          </button>
        </div>

        {/* Current Date Label */}
        <div className="text-center sm:text-right">
          <span className="text-sm font-black text-slate-900 capitalize block">
            {viewMode === 'day' && format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
            {viewMode === 'week' && `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`}
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: fr })}
            {viewMode === 'list' && `Agenda du ${format(weekStart, 'd MMMM', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {filteredEvents.filter((e) => isSameMonth(parseISO(e.start_time), currentDate)).length} séances programmées ce mois-ci
          </span>
        </div>
      </div>

      {/* VIEW 1: REAL TIME-GRID WEEKLY VIEW (Google / Apple Calendar Style) */}
      {viewMode === 'week' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Day Headers (Fixed top) */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/70 text-center font-bold text-xs sticky top-0 z-20">
            <div className="p-3 border-r border-slate-200 text-slate-400 font-mono text-[11px] flex items-center justify-center">
              GMT+1
            </div>
            {weekDays.map((day) => {
              const isTodayDay = isSameDay(day, currentDate);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                  className={`p-2.5 border-r border-slate-200 cursor-pointer transition-colors ${
                    isTodayDay ? 'bg-indigo-50/70' : 'hover:bg-slate-100/50'
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-wider text-slate-500">
                    {format(day, 'EEE', { locale: fr })}
                  </span>
                  <span
                    className={`inline-block mt-0.5 text-sm font-black rounded-full h-6 w-6 leading-6 ${
                      isTodayDay ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Grid Scroll Area */}
          <div className="relative overflow-x-auto max-h-[720px] overflow-y-auto">
            <div className="grid grid-cols-8 min-w-[900px] relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
              {/* Hour Labels Column (Left) */}
              <div className="border-r border-slate-200 bg-slate-50/40 select-none">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-slate-100 pr-2 text-right text-[11px] font-mono text-slate-400 flex items-start justify-end pt-1"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <span>{hour.toString().padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              {/* 7 Columns for Days */}
              {weekDays.map((day) => {
                const dayEvents = filteredEvents.filter((ev) => isSameDay(parseISO(ev.start_time), day));
                const isCurrentDay = isSameDay(day, currentDate);
                const isToday = isSameDay(day, now);
                const nowH = now.getHours();
                const nowM = now.getMinutes();
                const isLiveInRange = nowH >= 8 && nowH < 20;
                const liveTop = ((nowH - 8) * 60 + nowM) * (HOUR_HEIGHT / 60);

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-r border-slate-200 transition-colors ${
                      isCurrentDay ? 'bg-indigo-50/15' : 'bg-white'
                    }`}
                  >
                    {/* Background hour grid lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-slate-100 w-full"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* Real-time Live Indicator Line */}
                    {isToday && isLiveInRange && (
                      <div
                        className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
                        style={{ top: `${liveTop}px` }}
                      >
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-200 animate-pulse -ml-1" />
                        <div className="h-[2px] flex-1 bg-rose-500 shadow-sm" />
                        <span className="bg-rose-500 text-white text-[9px] font-bold font-mono px-1 py-0.2 rounded shadow-xs ml-0.5">
                          {format(now, 'HH:mm')}
                        </span>
                      </div>
                    )}

                    {/* Event Cards Positioned Proportionally */}
                    {dayEvents.map((ev, evIdx) => {
                      const { top, height } = computeGridPosition(ev);
                      const styles = getEventBadgeStyles(ev.event_type, ev.title);

                      // Simple overlap displacement if 2 events overlap
                      const overlapping = dayEvents.filter(
                        (other) =>
                          other.id !== ev.id &&
                          parseISO(other.start_time) < parseISO(ev.end_time) &&
                          parseISO(other.end_time) > parseISO(ev.start_time)
                      );
                      const isOverlapped = overlapping.length > 0;
                      const isSecond = isOverlapped && dayEvents.indexOf(ev) > dayEvents.indexOf(overlapping[0]);

                      const leftPercent = isOverlapped ? (isSecond ? 50 : 2) : 2;
                      const widthPercent = isOverlapped ? 47 : 96;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          className={`absolute rounded-xl border p-2 text-left cursor-pointer transition-all hover:scale-[1.01] hover:z-30 shadow-2xs overflow-hidden flex flex-col justify-between ${styles.bg} ${styles.border} ${styles.text}`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none mb-1">
                              <span>
                                {format(parseISO(ev.start_time), 'HH:mm')} - {format(parseISO(ev.end_time), 'HH:mm')}
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase border ${styles.pill}`}>
                                {ev.event_type}
                              </span>
                            </div>
                            <h4 className="text-xs font-black leading-tight line-clamp-2">
                              {ev.title}
                            </h4>
                          </div>

                          {(ev.room || ev.professor) && height >= 50 && (
                            <div className="text-[10px] opacity-85 font-medium truncate flex items-center space-x-1 pt-1 border-t border-slate-200/40">
                              {ev.room && (
                                <span className="truncate flex items-center">
                                  <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                  {ev.room}
                                </span>
                              )}
                              {ev.professor && (
                                <span className="truncate">
                                  • {ev.professor}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REAL MONTH VIEW (Full Calendar Grid) */}
      {viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Month Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center font-bold text-xs py-2 text-slate-700">
            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthDays.map((day) => {
              const inCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDay = isSameDay(day, new Date());
              const isSelected = isSameDay(day, currentDate);
              const dayEvents = filteredEvents.filter((ev) => isSameDay(parseISO(ev.start_time), day));

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                  className={`min-h-[110px] p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                    !inCurrentMonth
                      ? 'bg-slate-50/50 text-slate-300'
                      : isSelected
                      ? 'bg-indigo-50/40'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-black rounded-full h-6 w-6 flex items-center justify-center ${
                        isTodayDay
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : inCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayEvents.length} cours
                      </span>
                    )}
                  </div>

                  {/* Event Chips (Up to 3) */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const styles = getEventBadgeStyles(ev.event_type, ev.title);
                      return (
                        <div
                          key={ev.id}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold truncate border ${styles.bg} ${styles.border} ${styles.text}`}
                          title={`${ev.title} (${format(parseISO(ev.start_time), 'HH:mm')})`}
                        >
                          <span className="font-mono mr-1">{format(parseISO(ev.start_time), 'HH:mm')}</span>
                          <span>{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-indigo-600 font-bold block pl-1">
                        +{dayEvents.length - 3} autres...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DAY VIEW (Detailed Chronological Day Timeline) */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4">
            <div>
              <h3 className="text-base font-black text-slate-900 capitalize">
                {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </h3>
              <p className="text-xs text-indigo-800 font-medium mt-0.5">
                Emploi officiel ENSIA-SD & séances d'études programmées
              </p>
            </div>
            <button
              onClick={() => setViewMode('week')}
              className="rounded-xl bg-white border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-xs transition-all"
            >
              Retour vue semaine
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm divide-y divide-slate-100">
            {filteredEvents.filter((ev) => isSameDay(parseISO(ev.start_time), currentDate)).length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Aucun cours programmé ce jour</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  C'est un créneau idéal pour avancer sur vos devoirs ou lancer une session de focus avec le chrono.
                </p>
              </div>
            ) : (
              filteredEvents
                .filter((ev) => isSameDay(parseISO(ev.start_time), currentDate))
                .map((ev) => {
                  const styles = getEventBadgeStyles(ev.event_type, ev.title);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-4 rounded-2xl border my-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.005] shadow-xs ${styles.bg} ${styles.border}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            {format(parseISO(ev.start_time), 'HH:mm')} - {format(parseISO(ev.end_time), 'HH:mm')}
                          </span>
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase border ${styles.pill}`}>
                            {ev.event_type}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900">{ev.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                          {ev.room && (
                            <span className="flex items-center">
                              <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              Salle : {ev.room}
                            </span>
                          )}
                          {ev.professor && (
                            <span className="flex items-center">
                              <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              Prof. {ev.professor}
                            </span>
                          )}
                        </div>
                      </div>

                      {ev.event_type === 'study_session' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartChronoForTask({
                              id: ev.id,
                              user_id: '',
                              title: ev.title,
                              task_type: 'revision',
                              deadline: ev.end_time,
                              estimated_duration_minutes: 45,
                              actual_duration_minutes: 0,
                              priority: 'high',
                              difficulty: 3,
                              status: 'in_progress',
                              created_at: new Date().toISOString(),
                            });
                          }}
                          className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all active:scale-95 flex-shrink-0"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Lancer le Chrono</span>
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: AGENDA / LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900">
            Agenda chronologique — Semaine du {format(weekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
          </h3>

          <div className="space-y-6">
            {weekDays.map((day) => {
              const dayEvents = filteredEvents.filter((ev) => isSameDay(parseISO(ev.start_time), day));
              if (dayEvents.length === 0) return null;

              return (
                <div key={day.toISOString()} className="space-y-2.5">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-1.5">
                    <span className="text-sm font-black text-slate-900 capitalize">
                      {format(day, 'EEEE d MMMM', { locale: fr })}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {dayEvents.length} séances
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dayEvents.map((ev) => {
                      const styles = getEventBadgeStyles(ev.event_type, ev.title);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`rounded-2xl border p-3.5 text-left cursor-pointer transition-all hover:scale-[1.01] shadow-2xs flex flex-col justify-between space-y-2 ${styles.bg} ${styles.border}`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span className="font-mono text-slate-900">
                                {format(parseISO(ev.start_time), 'HH:mm')} - {format(parseISO(ev.end_time), 'HH:mm')}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase border ${styles.pill}`}>
                                {ev.event_type}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 leading-snug">{ev.title}</h4>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                            {ev.room && <span>Salle : {ev.room}</span>}
                            {ev.professor && <span>Prof. {ev.professor}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase border ${getEventBadgeStyles(selectedEvent.event_type).pill}`}>
                {selectedEvent.event_type}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {format(parseISO(selectedEvent.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">{selectedEvent.title}</h3>
              <p className="font-mono text-xs font-bold text-indigo-700 mt-1">
                {format(parseISO(selectedEvent.start_time), 'HH:mm')} — {format(parseISO(selectedEvent.end_time), 'HH:mm')}
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              {selectedEvent.room && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>Salle / Lieu : <strong className="text-slate-900">{selectedEvent.room}</strong></span>
                </div>
              )}
              {selectedEvent.professor && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Enseignant : <strong className="text-slate-900">{selectedEvent.professor}</strong></span>
                </div>
              )}
              {selectedEvent.notes && (
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-slate-600 mt-2 font-medium">
                  {selectedEvent.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1 stroke-[1.75]" />
                Supprimer
              </button>

              {selectedEvent.event_type === 'study_session' ? (
                <button
                  onClick={() => {
                    const ev = selectedEvent;
                    setSelectedEvent(null);
                    onStartChronoForTask({
                      id: ev.id,
                      user_id: '',
                      title: ev.title,
                      task_type: 'revision',
                      deadline: ev.end_time,
                      estimated_duration_minutes: 45,
                      actual_duration_minutes: 0,
                      priority: 'high',
                      difficulty: 3,
                      status: 'in_progress',
                      created_at: new Date().toISOString(),
                    });
                  }}
                  className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Démarrer le Chrono</span>
                </button>
              ) : (
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 transition-colors"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
