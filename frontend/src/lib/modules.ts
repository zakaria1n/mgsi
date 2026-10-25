import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface ModuleTheme {
  code: string;
  shortName: string;
  fullName: string;
  professor?: string;
  defaultRoom?: string;
  // Pastel Linear/Apple styling
  bgLight: string;
  bgHover: string;
  border: string;
  text: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  accentHex: string;
}

export const MODULE_THEMES: Record<string, ModuleTheme> = {
  M234: {
    code: 'M234',
    shortName: 'Progiciels ERP',
    fullName: 'M234 - Progiciels ERP',
    professor: 'Pr. SAAD Basma',
    defaultRoom: 'Salle 12',
    bgLight: 'bg-indigo-50/60',
    bgHover: 'hover:bg-indigo-100/70',
    border: 'border-indigo-200/80',
    text: 'text-indigo-700',
    dotColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    accentHex: '#6366f1',
  },
  M232: {
    code: 'M232',
    shortName: 'Gestion de projet & GL',
    fullName: 'M232 - Gestion de projet & Génie Logiciel',
    professor: 'Pr. RASSAM Latifa',
    defaultRoom: 'Amphi 1 / Salle 10 / Salle 4 INFO',
    bgLight: 'bg-emerald-50/60',
    bgHover: 'hover:bg-emerald-100/70',
    border: 'border-emerald-200/80',
    text: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    accentHex: '#10b981',
  },
  M237: {
    code: 'M237_1',
    shortName: 'Transf. Digitale',
    fullName: 'M237_1 - Transformation Digitale',
    professor: 'Pr. EL BICHRI Fadila',
    defaultRoom: 'Amphi 1',
    bgLight: 'bg-amber-50/60',
    bgHover: 'hover:bg-amber-100/70',
    border: 'border-amber-200/80',
    text: 'text-amber-800',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    accentHex: '#f59e0b',
  },
  M233: {
    code: 'M233',
    shortName: 'Admin BD Avancées',
    fullName: 'M233 - Admin BD Avancées',
    professor: 'Pr. LAASSAM',
    defaultRoom: 'Salle 10 / Salle 2 INFO',
    bgLight: 'bg-cyan-50/60',
    bgHover: 'hover:bg-cyan-100/70',
    border: 'border-cyan-200/80',
    text: 'text-cyan-800',
    dotColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800',
    accentHex: '#06b6d4',
  },
  M235: {
    code: 'M235',
    shortName: 'Audit des SI',
    fullName: 'M235 - Audit des Systèmes d’Information',
    professor: 'Pr. EL-ATEIF',
    defaultRoom: 'Salle 10 / Salle 2 INFO',
    bgLight: 'bg-rose-50/60',
    bgHover: 'hover:bg-rose-100/70',
    border: 'border-rose-200/80',
    text: 'text-rose-800',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    accentHex: '#f43f5e',
  },
  M236: {
    code: 'M236',
    shortName: 'Systèmes Distribués',
    fullName: 'M236 - Systèmes Distribués',
    professor: 'Pr. BOUJERFAOUI Said',
    defaultRoom: 'Salle 6 / Salle 3 INFO',
    bgLight: 'bg-purple-50/60',
    bgHover: 'hover:bg-purple-100/70',
    border: 'border-purple-200/80',
    text: 'text-purple-800',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    accentHex: '#a855f7',
  },
  M231_1: {
    code: 'M231_1',
    shortName: 'Langue Française',
    fullName: 'M231_1 - Langue Française',
    professor: 'Pr. Mohamed EL OUARDI',
    defaultRoom: 'Amphi 3',
    bgLight: 'bg-sky-50/60',
    bgHover: 'hover:bg-sky-100/70',
    border: 'border-sky-200/80',
    text: 'text-sky-800',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    accentHex: '#0ea5e9',
  },
  M231_2: {
    code: 'M231_2',
    shortName: 'Langue Anglaise',
    fullName: 'M231_2 - Langue Anglaise',
    professor: 'Pr. Mohamed HIKAL',
    defaultRoom: 'Amphi 3',
    bgLight: 'bg-blue-50/60',
    bgHover: 'hover:bg-blue-100/70',
    border: 'border-blue-200/80',
    text: 'text-blue-800',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    accentHex: '#3b82f6',
  },
};

const DEFAULT_THEME: ModuleTheme = {
  code: 'GEN',
  shortName: 'Général',
  fullName: 'Activité Générale',
  bgLight: 'bg-slate-50',
  bgHover: 'hover:bg-slate-100',
  border: 'border-slate-200',
  text: 'text-slate-800',
  dotColor: 'bg-slate-400',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
  accentHex: '#64748b',
};

/**
 * Returns the matching ModuleTheme by matching codes or keywords in subject title
 */
export function getModuleTheme(str?: string | null): ModuleTheme {
  if (!str) return DEFAULT_THEME;
  const s = str.toUpperCase();

  if (s.includes('M234') || s.includes('ERP') || s.includes('PROGICIEL')) return MODULE_THEMES.M234;
  if (s.includes('M232') || s.includes('PROJET') || s.includes('LOGICIEL')) return MODULE_THEMES.M232;
  if (s.includes('M237') || s.includes('TRANSF') || s.includes('DIGIT')) return MODULE_THEMES.M237;
  if (s.includes('M233') || s.includes('ADMIN') || s.includes('BD') || s.includes('DONNEES') || s.includes('DONNÉES')) return MODULE_THEMES.M233;
  if (s.includes('M235') || s.includes('AUDIT')) return MODULE_THEMES.M235;
  if (s.includes('M236') || s.includes('DISTRIB')) return MODULE_THEMES.M236;
  if (s.includes('M231_1') || s.includes('FRANCAIS') || s.includes('FRANÇAIS')) return MODULE_THEMES.M231_1;
  if (s.includes('M231_2') || s.includes('ANGLAIS') || s.includes('ENGLISH')) return MODULE_THEMES.M231_2;

  return DEFAULT_THEME;
}

/**
 * Get visual styling badge for event types (CM, TD, TP, Exam, Study Session)
 */
export function getEventTypeBadge(eventType?: string | null): { label: string; bg: string; text: string; border: string } {
  switch (eventType) {
    case 'CM':
      return { label: 'CM', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case 'TD':
      return { label: 'TD', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'TP':
      return { label: 'TP', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'study_session':
      return { label: 'Focus IA', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'exam':
      return { label: 'Examen', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'personal':
      return { label: 'Personnel', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    default:
      return { label: eventType || 'Activité', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

/**
 * Tactile feedback for mobile (Capacitor Haptics) with safe fallback on desktop/web
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'selection' = 'light') {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      if (style === 'selection') {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } else {
        const impactStyle =
          style === 'heavy'
            ? ImpactStyle.Heavy
            : style === 'medium'
            ? ImpactStyle.Medium
            : ImpactStyle.Light;
        await Haptics.impact({ style: impactStyle });
      }
    }
  } catch {
    // Graceful fallback for standard web browser vibration API if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(style === 'heavy' ? 30 : style === 'medium' ? 20 : 10);
    }
  }
}

/**
 * Generates an RFC 5545 standard iCalendar (.ics) file content from CalendarEvents
 * and triggers immediate browser download.
 */
export function exportCalendarToICS(events: any[], filename = 'MGSI_Planner_Semestre_3.ics') {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const formatDateToICS = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const nowICS = formatDateToICS(new Date().toISOString());

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MGSI Planner//ENSIA-SD Taroudant//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MGSI Planner S3',
    'X-WR-TIMEZONE:Africa/Casablanca',
  ];

  events.forEach((ev) => {
    const start = formatDateToICS(ev.start_time);
    const end = formatDateToICS(ev.end_time);
    const summary = (ev.title || 'Séance MGSI').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const location = (ev.room || 'ENSIA-SD Taroudant').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const description = [
      ev.professor ? `Enseignant: ${ev.professor}` : '',
      ev.event_type ? `Type: ${ev.event_type}` : '',
      ev.notes ? `Notes: ${ev.notes}` : '',
      'Emploi du temps MGSI S3 - ENSIA-SD',
    ].filter(Boolean).join('\\n');

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${ev.id || Math.random().toString(36).substring(2)}@mgsi.ensia-sd.ac.ma`);
    icsContent.push(`DTSTAMP:${nowICS}`);
    icsContent.push(`DTSTART:${start}`);
    icsContent.push(`DTEND:${end}`);
    icsContent.push(`SUMMARY:${summary}`);
    if (location) icsContent.push(`LOCATION:${location}`);
    if (description) icsContent.push(`DESCRIPTION:${description}`);
    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
