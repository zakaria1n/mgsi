import { addDays, format, isBefore, isAfter, differenceInMinutes, parseISO, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';
import { Task, CalendarEvent, StudentProfile, TimeSlot, TaskSession, UserVelocityStats } from '../types';

export interface SchedulingOptions {
  startDate?: Date;
  daysAhead?: number;
  maxDailyMinutes?: number;
  preferredSessionMinutes?: number;
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
  breakMinutes?: number;
}

export interface SplitSessionPlan {
  title: string;
  order: number;
  plannedMinutes: number;
  preferredDayOffset: number; // 0 = today, 1 = tomorrow, etc.
}

export class SchedulingEngine {
  /**
   * Calculate dynamic urgency score for a task.
   * Urgency > 100 indicates high critical danger / imminent deadline.
   */
  public static calculateTaskUrgency(task: Task, now: Date = new Date()): number {
    const deadline = new Date(task.deadline);
    const minutesLeft = differenceInMinutes(deadline, now);
    const daysLeft = Math.max(0.1, minutesLeft / (24 * 60));

    // Base weight by task type
    const typeWeights: Record<string, number> = {
      exam_prep: 2.0,
      project: 1.6,
      devoir: 1.4,
      presentation: 1.3,
      report: 1.2,
      exercise: 1.0,
      revision: 1.1,
      research: 0.9,
      other: 0.8,
    };

    const typeFactor = typeWeights[task.task_type] || 1.0;
    const difficultyFactor = 1.0 + (task.difficulty - 1) * 0.15; // 1.0 -> 1.6
    
    let priorityFactor = 1.0;
    if (task.priority === 'urgent') priorityFactor = 2.0;
    else if (task.priority === 'high') priorityFactor = 1.5;
    else if (task.priority === 'medium') priorityFactor = 1.0;
    else if (task.priority === 'low') priorityFactor = 0.7;

    const remainingWork = Math.max(15, task.estimated_duration_minutes - (task.actual_duration_minutes || 0));
    
    // Proximity factor: exponential increase as deadline approaches
    // e.g., 1 day left -> 100/1 = 100, 7 days left -> 100/7 = 14.3
    const proximityScore = 150 / Math.pow(daysLeft, 0.85);

    const urgencyScore = (proximityScore * typeFactor * priorityFactor * difficultyFactor) + (remainingWork / 60) * 10;
    return Math.round(urgencyScore);
  }

  /**
   * Adjust estimated duration using student velocity stats if available.
   */
  public static getAdjustedDuration(task: Task, velocityStats?: UserVelocityStats[]): number {
    let duration = task.estimated_duration_minutes;
    if (velocityStats && velocityStats.length > 0) {
      const match = velocityStats.find(
        (v) => v.subject_id === task.subject_id && v.task_type === task.task_type
      );
      if (match && match.samples_count >= 2) {
        duration = Math.round(duration * match.avg_ratio_actual_vs_planned);
      }
    }
    return Math.max(15, duration);
  }

  /**
   * Split a large task intelligently into manageable, human-friendly sessions across multiple days.
   * Never schedule giant 4-hour blocks.
   */
  public static splitTaskIntoSessions(
    task: Task,
    totalRemainingMinutes: number,
    daysAvailable: number,
    preferredSessionMinutes: number = 45
  ): SplitSessionPlan[] {
    const plans: SplitSessionPlan[] = [];

    // Small tasks: single session
    if (totalRemainingMinutes <= 50) {
      plans.push({
        title: `${task.title} - Session de travail`,
        order: 1,
        plannedMinutes: totalRemainingMinutes,
        preferredDayOffset: 0,
      });
      return plans;
    }

    // Determine optimal session chunk size (between 30 and 60 minutes)
    let chunkSize = preferredSessionMinutes;
    if (chunkSize < 30) chunkSize = 30;
    if (chunkSize > 60) chunkSize = 60;

    const sessionCount = Math.ceil(totalRemainingMinutes / chunkSize);
    const actualChunkMinutes = Math.round(totalRemainingMinutes / sessionCount);

    // Human pedagogical phase labels based on task type
    const phaseNamesForProject = [
      'Compréhension du sujet & Spécifications',
      'Recherche préliminaire & Architecture',
      'Démarrage de la mise en œuvre',
      'Développement des fonctionnalités clés',
      'Intégration & Résolution des bugs',
      'Revue du code & Finitions',
      'Corrections finales & Validation',
    ];

    const phaseNamesForExam = [
      "Synthèse des chapitres & Notions clés",
      "Exercices d'application fondamentaux",
      "Approfondissement des cas complexes",
      "Épreuve blanche & Révision finale",
    ];

    const phaseNamesForDevoir = [
      "Analyse de l'énoncé & Démarche",
      "Rédaction de la solution",
      "Vérification & Finalisation",
    ];

    const chosenPhases =
      task.task_type === 'project'
        ? phaseNamesForProject
        : task.task_type === 'exam_prep'
        ? phaseNamesForExam
        : phaseNamesForDevoir;

    // Distribute sessions over available days
    const dayStride = Math.max(1, Math.floor(daysAvailable / sessionCount));

    for (let i = 0; i < sessionCount; i++) {
      const dayOffset = Math.min(daysAvailable - 1, i * dayStride);
      const phaseLabel = chosenPhases[i % chosenPhases.length] || `Partie ${i + 1}`;
      plans.push({
        title: `${task.title} [${i + 1}/${sessionCount}] : ${phaseLabel}`,
        order: i + 1,
        plannedMinutes: actualChunkMinutes,
        preferredDayOffset: dayOffset,
      });
    }

    return plans;
  }

  /**
   * Find realistic free time slots for a given day, excluding:
   * 1. Sleep hours (e.g. 23:30 - 07:00)
   * 2. Lunch & Dinner hours (e.g. 12:15 - 14:30, 19:30 - 20:30)
   * 3. Existing calendar events (Classes, exams, appointments)
   * 4. Travel/commute buffer (15 min after classes)
   */
  public static getFreeSlotsForDay(
    day: Date,
    profile: StudentProfile,
    events: CalendarEvent[],
    options: { minSlotMinutes?: number; bufferMinutes?: number } = {}
  ): TimeSlot[] {
    const minSlotMinutes = options.minSlotMinutes || 25;
    const bufferMinutes = options.bufferMinutes || 10;

    // Create day boundaries (from wake-up to sleep)
    const [wakeH, wakeM] = profile.sleep_end.split(':').map(Number);
    const [sleepH, sleepM] = profile.sleep_start.split(':').map(Number);

    let dayStart = setMinutes(setHours(startOfDay(day), wakeH), wakeM);
    let dayEnd = setMinutes(setHours(startOfDay(day), sleepH), sleepM);

    // If dayStart is in the past for today, clamp dayStart to now + 10m
    const now = new Date();
    if (isBefore(dayStart, now) && format(day, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      dayStart = new Date(now.getTime() + 10 * 60 * 1000);
    }

    if (isAfter(dayStart, dayEnd)) return [];

    // Collect all busy intervals for this day
    interface Interval {
      start: Date;
      end: Date;
    }

    const busyIntervals: Interval[] = [];

    // Lunch block
    if (profile.lunch_start && profile.lunch_end) {
      const [lh1, lm1] = profile.lunch_start.split(':').map(Number);
      const [lh2, lm2] = profile.lunch_end.split(':').map(Number);
      busyIntervals.push({
        start: setMinutes(setHours(startOfDay(day), lh1), lm1),
        end: setMinutes(setHours(startOfDay(day), lh2), lm2),
      });
    }

    // Dinner block
    if (profile.dinner_start && profile.dinner_end) {
      const [dh1, dm1] = profile.dinner_start.split(':').map(Number);
      const [dh2, dm2] = profile.dinner_end.split(':').map(Number);
      busyIntervals.push({
        start: setMinutes(setHours(startOfDay(day), dh1), dm1),
        end: setMinutes(setHours(startOfDay(day), dh2), dm2),
      });
    }

    // Calendar events (Classes, exams, previous study sessions)
    const dayEvents = events.filter((ev) => {
      const evStart = new Date(ev.start_time);
      const evEnd = new Date(ev.end_time);
      return (
        format(evStart, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') ||
        (isBefore(evStart, dayEnd) && isAfter(evEnd, dayStart))
      );
    });

    for (const ev of dayEvents) {
      const evStart = new Date(ev.start_time);
      const evEnd = new Date(ev.end_time);
      // Add a small commute/transition buffer
      const bufferedStart = new Date(evStart.getTime() - bufferMinutes * 60 * 1000);
      const bufferedEnd = new Date(evEnd.getTime() + bufferMinutes * 60 * 1000);
      busyIntervals.push({ start: bufferedStart, end: bufferedEnd });
    }

    // Sort intervals by start time
    busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping intervals
    const merged: Interval[] = [];
    for (const interval of busyIntervals) {
      if (merged.length === 0) {
        merged.push({ ...interval });
      } else {
        const last = merged[merged.length - 1];
        if (isBefore(interval.start, last.end) || interval.start.getTime() === last.end.getTime()) {
          if (isAfter(interval.end, last.end)) {
            last.end = interval.end;
          }
        } else {
          merged.push({ ...interval });
        }
      }
    }

    // Invert merged busy intervals to get free slots
    const freeSlots: TimeSlot[] = [];
    let currentPointer = new Date(dayStart.getTime());

    for (const b of merged) {
      if (isAfter(b.start, currentPointer)) {
        const slotEnd = isBefore(b.start, dayEnd) ? b.start : dayEnd;
        const dur = differenceInMinutes(slotEnd, currentPointer);
        if (dur >= minSlotMinutes) {
          freeSlots.push({
            start: new Date(currentPointer.getTime()),
            end: new Date(slotEnd.getTime()),
            durationMinutes: dur,
          });
        }
      }
      if (isAfter(b.end, currentPointer)) {
        currentPointer = new Date(b.end.getTime());
      }
    }

    // Check tail after last busy interval until dayEnd
    if (isBefore(currentPointer, dayEnd)) {
      const dur = differenceInMinutes(dayEnd, currentPointer);
      if (dur >= minSlotMinutes) {
        freeSlots.push({
          start: new Date(currentPointer.getTime()),
          end: new Date(dayEnd.getTime()),
          durationMinutes: dur,
        });
      }
    }

    return freeSlots;
  }

  /**
   * Main intelligent scheduling method.
   * Takes tasks, profile, and existing events, and returns a balanced, human-friendly calendar plan.
   */
  public static planSchedule(
    tasks: Task[],
    profile: StudentProfile,
    existingEvents: CalendarEvent[],
    velocityStats: UserVelocityStats[] = [],
    options: SchedulingOptions = {}
  ): {
    sessionsToCreate: {
      taskId: string;
      title: string;
      startTime: string;
      endTime: string;
      plannedMinutes: number;
      order: number;
    }[];
    conflicts: {
      taskId: string;
      taskTitle: string;
      reason: string;
      suggestedAction: string;
    }[];
    summary: {
      totalTasksScheduled: number;
      totalMinutesPlanned: number;
      freeHoursRemaining: number;
    };
  } {
    const now = options.startDate || new Date();
    const daysAhead = options.daysAhead || 7;
    const maxDailyMinutes = (profile.max_daily_study_hours || 4) * 60;
    const preferredSessionMinutes = profile.preferred_session_minutes || 45;
    const breakMinutes = options.breakMinutes || 15;

    // Filter only incomplete tasks with deadlines in the future
    const pendingTasks = tasks
      .filter((t) => t.status !== 'completed')
      .map((t) => ({
        ...t,
        calculated_urgency: this.calculateTaskUrgency(t, now),
        adjustedDuration: this.getAdjustedDuration(t, velocityStats),
      }))
      // Sort by descending urgency score
      .sort((a, b) => (b.calculated_urgency || 0) - (a.calculated_urgency || 0));

    const sessionsToCreate: {
      taskId: string;
      title: string;
      startTime: string;
      endTime: string;
      plannedMinutes: number;
      order: number;
    }[] = [];

    const conflicts: {
      taskId: string;
      taskTitle: string;
      reason: string;
      suggestedAction: string;
    }[] = [];

    // Track dynamic calendar events during planning
    const simulatedEvents = [...existingEvents];
    // Track daily study minutes to avoid fatigue
    const dailyStudyMinutes: Record<string, number> = {};

    for (const task of pendingTasks) {
      const deadline = new Date(task.deadline);
      const remainingMinutes = Math.max(15, task.adjustedDuration - (task.actual_duration_minutes || 0));
      const totalDaysUntilDeadline = Math.max(1, Math.min(daysAhead, Math.ceil(differenceInMinutes(deadline, now) / (24 * 60))));

      // Intelligently split task into chunks
      const sessionPlans = this.splitTaskIntoSessions(task, remainingMinutes, totalDaysUntilDeadline, preferredSessionMinutes);

      for (const sessionPlan of sessionPlans) {
        let scheduled = false;

        // Try to place the session starting from its preferredDayOffset
        for (let d = sessionPlan.preferredDayOffset; d < daysAhead; d++) {
          const targetDay = addDays(now, d);
          const dayKey = format(targetDay, 'yyyy-MM-dd');
          const currentDailyMinutes = dailyStudyMinutes[dayKey] || 0;

          // Enforce human fatigue limit
          if (currentDailyMinutes + sessionPlan.plannedMinutes > maxDailyMinutes) {
            continue;
          }

          // Do not schedule past task deadline
          if (isAfter(targetDay, deadline)) {
            break;
          }

          // Get free slots for targetDay
          const freeSlots = this.getFreeSlotsForDay(targetDay, profile, simulatedEvents, { minSlotMinutes: sessionPlan.plannedMinutes });

          // Find slot that fits sessionPlan.plannedMinutes
          const suitableSlot = freeSlots.find((slot) => slot.durationMinutes >= sessionPlan.plannedMinutes);

          if (suitableSlot) {
            const sessionStart = new Date(suitableSlot.start.getTime());
            const sessionEnd = new Date(sessionStart.getTime() + sessionPlan.plannedMinutes * 60 * 1000);

            // Create planned session
            sessionsToCreate.push({
              taskId: task.id,
              title: sessionPlan.title,
              startTime: sessionStart.toISOString(),
              endTime: sessionEnd.toISOString(),
              plannedMinutes: sessionPlan.plannedMinutes,
              order: sessionPlan.order,
            });

            // Add simulated event with mandatory break to prevent back-to-back burnout
            const breakEnd = new Date(sessionEnd.getTime() + breakMinutes * 60 * 1000);
            simulatedEvents.push({
              id: `sim-${task.id}-${sessionPlan.order}`,
              user_id: profile.id,
              title: sessionPlan.title,
              event_type: 'study_session',
              start_time: sessionStart.toISOString(),
              end_time: breakEnd.toISOString(),
            });

            dailyStudyMinutes[dayKey] = currentDailyMinutes + sessionPlan.plannedMinutes;
            scheduled = true;
            break;
          }
        }

        if (!scheduled) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            reason: `Temps libre insuffisant avant l'échéance (${format(deadline, 'dd/MM/yyyy HH:mm')}) ou dépassement de la limite de fatigue quotidienne (${profile.max_daily_study_hours}h/jour).`,
            suggestedAction: `Réduire la durée estimée, décaler l'échéance ou libérer des créneaux personnels.`,
          });
        }
      }
    }

    const totalMinutesPlanned = sessionsToCreate.reduce((acc, s) => acc + s.plannedMinutes, 0);

    return {
      sessionsToCreate,
      conflicts,
      summary: {
        totalTasksScheduled: new Set(sessionsToCreate.map((s) => s.taskId)).size,
        totalMinutesPlanned,
        freeHoursRemaining: Math.round(
          Math.max(0, daysAhead * (profile.max_daily_study_hours || 4) - totalMinutesPlanned / 60) * 10
        ) / 10,
      },
    };
  }
}
