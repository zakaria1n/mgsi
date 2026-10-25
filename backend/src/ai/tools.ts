import { supabase } from '../config/supabase';
import { SchedulingEngine } from '../scheduling/engine';
import { LearningEngine } from '../scheduling/learning';
import { addDays, format, parseISO } from 'date-fns';

export interface ToolExecutionContext {
  userId: string;
}

export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'read_calendar',
    description: "Lit les événements du calendrier et les cours de l'étudiant pour une période donnée.",
    parameters: {
      type: 'OBJECT',
      properties: {
        startDate: { type: 'STRING', description: 'Date de début au format ISO ou YYYY-MM-DD' },
        endDate: { type: 'STRING', description: 'Date de fin au format ISO ou YYYY-MM-DD' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'read_tasks',
    description: "Lit la liste des devoirs, projets et tâches académiques de l'étudiant.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'Filtrer par statut: "todo", "in_progress", "completed" ou "all"' },
      },
    },
  },
  {
    name: 'read_exams',
    description: 'Lit la liste des examens et contrôles programmés avec leurs matières et dates.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_free_slots',
    description: 'Calcule les créneaux libres réels disponibles pour étudier un jour donné en excluant sommeil, cours et repas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Date cible (YYYY-MM-DD)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_task',
    description: 'Crée un nouveau devoir, projet ou tâche académique avec échéance et durée estimée.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Titre de la tâche ou du devoir' },
        subjectCode: { type: 'STRING', description: 'Code de la matière (ex: M232, M233, M234, M235, M236, M237_1, M231_1, M231_2)' },
        taskType: { type: 'STRING', description: 'Type: devoir, project, exercise, presentation, report, revision, exam_prep, other' },
        deadline: { type: 'STRING', description: "Date et heure d'échéance (format ISO ou YYYY-MM-DD HH:mm)" },
        estimatedDurationMinutes: { type: 'INTEGER', description: 'Durée estimée totale en minutes (ex: 45, 90, 180)' },
        priority: { type: 'STRING', description: 'Priorité: low, medium, high, urgent' },
        difficulty: { type: 'INTEGER', description: 'Difficulté estimée de 1 (facile) à 5 (très difficile)' },
        description: { type: 'STRING', description: 'Description optionnelle des consignes' },
      },
      required: ['title', 'deadline'],
    },
  },
  {
    name: 'mark_task_completed',
    description: 'Marque un devoir ou une tâche comme terminée.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: { type: 'STRING', description: "Identifiant UUID de la tâche" },
        taskTitle: { type: 'STRING', description: "Titre de la tâche si l'UUID n'est pas connu" },
      },
    },
  },
  {
    name: 'delete_task',
    description: 'Supprime une tâche académique.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: { type: 'STRING', description: "Identifiant UUID de la tâche à supprimer" },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'create_calendar_event',
    description: "Ajoute un événement personnel ou une séance d'étude directement dans l'emploi du temps.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: "Titre de l'événement" },
        eventType: { type: 'STRING', description: 'Type: study_session, personal, exam, other' },
        startTime: { type: 'STRING', description: "Date/heure de début ISO" },
        endTime: { type: 'STRING', description: "Date/heure de fin ISO" },
        room: { type: 'STRING', description: 'Salle ou lieu optionnel' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: "Supprime un événement ou une session d'étude du calendrier.",
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING', description: "UUID de l'événement à supprimer" },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'organize_schedule',
    description: "Planificateur intelligent: Analyse tous les devoirs et examens, découpe les tâches lourdes en plusieurs jours, et génère les séances d'études idéales dans l'emploi du temps en respectant le sommeil, les cours et les repas.",
    parameters: {
      type: 'OBJECT',
      properties: {
        daysAhead: { type: 'INTEGER', description: 'Nombre de jours à planifier (défaut: 7)' },
      },
    },
  },
  {
    name: 'reschedule_incomplete_session',
    description: "Reprogramme intelligemment le travail restant d'une session que l'étudiant n'a pas pu terminer.",
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: { type: 'STRING', description: 'UUID de la tâche non finie' },
        remainingMinutes: { type: 'INTEGER', description: 'Nombre de minutes restantes à accomplir' },
      },
      required: ['taskId', 'remainingMinutes'],
    },
  },
];

export class AIToolExecutor {
  public static async execute(name: string, args: any, context: ToolExecutionContext): Promise<any> {
    const userId = context.userId;

    switch (name) {
      case 'read_calendar': {
        const { startDate, endDate } = args;
        const { data, error } = await supabase
          .from('calendar_events')
          .select('id, title, event_type, start_time, end_time, room, professor')
          .eq('user_id', userId)
          .gte('end_time', startDate)
          .lte('start_time', endDate)
          .order('start_time', { ascending: true });

        if (error) throw new Error(error.message);
        return { events: data || [] };
      }

      case 'read_tasks': {
        let query = supabase
          .from('tasks')
          .select('*, subject:subjects(code, name, color)')
          .eq('user_id', userId)
          .order('deadline', { ascending: true });

        if (args.status && args.status !== 'all') {
          query = query.eq('status', args.status);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return { tasks: data || [] };
      }

      case 'read_exams': {
        const { data, error } = await supabase
          .from('exams')
          .select('*, subject:subjects(code, name, color)')
          .eq('user_id', userId)
          .order('exam_date', { ascending: true });

        if (error) throw new Error(error.message);
        return { exams: data || [] };
      }

      case 'get_free_slots': {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId);
        const targetDate = parseISO(args.date);
        const slots = SchedulingEngine.getFreeSlotsForDay(targetDate, profile, events || []);
        return {
          date: args.date,
          freeSlotsCount: slots.length,
          slots: slots.map((s) => ({
            start: format(s.start, 'HH:mm'),
            end: format(s.end, 'HH:mm'),
            durationMinutes: s.durationMinutes,
          })),
        };
      }

      case 'create_task': {
        let subjectId: string | null = null;
        if (args.subjectCode) {
          const { data: subj } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', userId)
            .ilike('code', `%${args.subjectCode}%`)
            .maybeSingle();
          if (subj) subjectId = subj.id;
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            subject_id: subjectId,
            title: args.title,
            description: args.description || null,
            task_type: args.taskType || 'devoir',
            deadline: new Date(args.deadline).toISOString(),
            estimated_duration_minutes: args.estimatedDurationMinutes || 45,
            priority: args.priority || 'medium',
            difficulty: args.difficulty || 3,
            status: 'todo',
          })
          .select('*, subject:subjects(code, name)')
          .single();

        if (error) throw new Error(error.message);
        return { success: true, createdTask: data };
      }

      case 'mark_task_completed': {
        let targetId = args.taskId;
        if (!targetId && args.taskTitle) {
          const { data: match } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', userId)
            .ilike('title', `%${args.taskTitle}%`)
            .limit(1)
            .maybeSingle();
          if (match) targetId = match.id;
        }

        if (!targetId) throw new Error('Tâche introuvable');

        const { data, error } = await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', targetId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return { success: true, completedTask: data };
      }

      case 'delete_task': {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', args.taskId)
          .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return { success: true, deletedTaskId: args.taskId };
      }

      case 'create_calendar_event': {
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({
            user_id: userId,
            title: args.title,
            event_type: args.eventType || 'personal',
            start_time: new Date(args.startTime).toISOString(),
            end_time: new Date(args.endTime).toISOString(),
            room: args.room || null,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return { success: true, createdEvent: data };
      }

      case 'delete_calendar_event': {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', args.eventId)
          .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return { success: true, deletedEventId: args.eventId };
      }

      case 'organize_schedule': {
        const daysAhead = args.daysAhead || 7;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId);
        const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId);
        const velocity = await LearningEngine.getUserVelocity(userId);

        const plan = SchedulingEngine.planSchedule(
          tasks || [],
          profile,
          events || [],
          velocity,
          { daysAhead }
        );

        // Persist scheduled sessions into calendar_events & task_sessions
        for (const s of plan.sessionsToCreate) {
          const { data: taskSession } = await supabase
            .from('task_sessions')
            .insert({
              task_id: s.taskId,
              user_id: userId,
              title: s.title,
              scheduled_start: s.startTime,
              scheduled_end: s.endTime,
              planned_minutes: s.plannedMinutes,
              session_order: s.order,
              status: 'scheduled',
            })
            .select()
            .single();

          if (taskSession) {
            await supabase.from('calendar_events').insert({
              user_id: userId,
              title: s.title,
              event_type: 'study_session',
              start_time: s.startTime,
              end_time: s.endTime,
              notes: `Session planifiée automatiquement (${s.plannedMinutes} min)`,
            });
          }
        }

        return {
          success: true,
          scheduledSessionsCount: plan.sessionsToCreate.length,
          plannedSessions: plan.sessionsToCreate.map((s) => ({
            title: s.title,
            start: format(new Date(s.startTime), 'EEEE dd/MM HH:mm'),
            durationMinutes: s.plannedMinutes,
          })),
          conflicts: plan.conflicts,
          summary: plan.summary,
        };
      }

      case 'reschedule_incomplete_session': {
        const { data: task } = await supabase.from('tasks').select('*').eq('id', args.taskId).eq('user_id', userId).single();
        if (!task) throw new Error('Tâche introuvable pour replanification');

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId);

        // Find next free slot in next 3 days
        let allocatedSlot = null;
        for (let d = 0; d < 3; d++) {
          const targetDay = addDays(new Date(), d);
          const slots = SchedulingEngine.getFreeSlotsForDay(targetDay, profile, events || [], { minSlotMinutes: args.remainingMinutes });
          if (slots.length > 0) {
            allocatedSlot = {
              start: slots[0].start,
              end: new Date(slots[0].start.getTime() + args.remainingMinutes * 60 * 1000),
            };
            break;
          }
        }

        if (!allocatedSlot) {
          return {
            success: false,
            message: 'Aucun créneau libre suffisant trouvé dans les 3 prochains jours. Veuillez libérer du temps dans votre emploi du temps personnel.',
          };
        }

        const { data: newEv } = await supabase.from('calendar_events').insert({
          user_id: userId,
          title: `Rattrapage : ${task.title} (${args.remainingMinutes} min)`,
          event_type: 'study_session',
          start_time: allocatedSlot.start.toISOString(),
          end_time: allocatedSlot.end.toISOString(),
          notes: 'Session de rattrapage reprogrammée intelligemment',
        }).select().single();

        return {
          success: true,
          message: `Le travail restant (${args.remainingMinutes} min) a été reprogrammé pour le ${format(allocatedSlot.start, 'dd/MM à HH:mm')}.`,
          scheduledEvent: newEv,
        };
      }

      default:
        throw new Error(`Outil inconnu : ${name}`);
    }
  }
}
