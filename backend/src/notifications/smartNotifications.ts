import { supabase } from '../config/supabase';
import { differenceInDays, differenceInHours, format } from 'date-fns';

export class SmartNotificationService {
  /**
   * Generates contextual smart notifications for a student based on current state.
   */
  public static async evaluateAndGenerate(userId: string) {
    const now = new Date();

    // 1. Fetch incomplete tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, subject:subjects(code, name)')
      .eq('user_id', userId)
      .neq('status', 'completed');

    // 2. Fetch upcoming exams
    const { data: exams } = await supabase
      .from('exams')
      .select('*, subject:subjects(code, name)')
      .eq('user_id', userId)
      .gte('exam_date', now.toISOString());

    // 3. Fetch scheduled sessions
    const { data: sessions } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'study_session')
      .gte('start_time', now.toISOString());

    const generatedNotifications: {
      user_id: string;
      title: string;
      message: string;
      notification_type: string;
      related_task_id?: string;
      related_exam_id?: string;
    }[] = [];

    // Analyze tasks for urgent warnings
    if (tasks) {
      for (const t of tasks) {
        const deadline = new Date(t.deadline);
        const hoursLeft = differenceInHours(deadline, now);
        const completionPct = t.estimated_duration_minutes > 0
          ? Math.round(((t.actual_duration_minutes || 0) / t.estimated_duration_minutes) * 100)
          : 0;

        if (hoursLeft < 0) {
          generatedNotifications.push({
            user_id: userId,
            title: `Retard : ${t.title}`,
            message: `L'échéance (${format(deadline, 'dd/MM à HH:mm')}) est dépassée. Il vous reste environ ${Math.max(15, t.estimated_duration_minutes - t.actual_duration_minutes)} minutes de travail pour clôturer ce rendu.`,
            notification_type: 'overdue_alert',
            related_task_id: t.id,
          });
        } else if (hoursLeft <= 24) {
          generatedNotifications.push({
            user_id: userId,
            title: `Échéance imminente : ${t.title}`,
            message: `Ce travail pour ${t.subject?.code || 'votre matière'} est dû dans ${hoursLeft}h et vous avez complété seulement ${completionPct}% du travail prévu.`,
            notification_type: 'deadline_warning',
            related_task_id: t.id,
          });
        }
      }
    }

    // Analyze exams for revision roadmaps
    if (exams) {
      for (const ex of exams) {
        const examDate = new Date(ex.exam_date);
        const daysLeft = differenceInDays(examDate, now);

        const hasScheduledRevision = sessions?.some((s) =>
          s.title.toLowerCase().includes(ex.subject?.code?.toLowerCase() || '') ||
          s.title.toLowerCase().includes('révision')
        );

        if (daysLeft <= 14 && !hasScheduledRevision) {
          generatedNotifications.push({
            user_id: userId,
            title: `Examen dans ${daysLeft} jours : ${ex.title}`,
            message: `Votre examen de ${ex.subject?.name || ex.subject?.code} approche (${format(examDate, 'dd/MM/yyyy')}) et aucune séance de révision n'est encore planifiée. Demandez à l'IA d'organiser votre préparation.`,
            notification_type: 'exam_prep',
            related_exam_id: ex.id,
          });
        }
      }
    }

    // Persist new unique notifications
    for (const notif of generatedNotifications) {
      // Check if similar notification already created today
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('title', notif.title)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        await supabase.from('notifications').insert(notif);
      }
    }

    const { data: allNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return allNotifs || [];
  }
}
