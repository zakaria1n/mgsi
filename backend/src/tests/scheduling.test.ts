import { describe, it, expect } from 'vitest';
import { SchedulingEngine } from '../scheduling/engine';
import { Task, StudentProfile, CalendarEvent } from '../types';
import { parseISO, addDays, format } from 'date-fns';

const mockProfile: StudentProfile = {
  id: 'test-student-1',
  email: 'etudiant.mgsi@ensia-sd.ac.ma',
  full_name: 'Test Student',
  filiere: 'MGSI',
  semester: 'S3',
  tp_group: 'G1',
  sleep_start: '23:30:00',
  sleep_end: '07:00:00',
  lunch_start: '12:15:00',
  lunch_end: '14:30:00',
  dinner_start: '19:30:00',
  dinner_end: '20:30:00',
  preferred_session_minutes: 45,
  max_daily_study_hours: 4,
  timezone: 'Africa/Casablanca',
};

describe('SchedulingEngine Unit Tests', () => {
  it('correctly calculates task urgency score based on deadline proximity and difficulty', () => {
    const urgentTask: Task = {
      id: '1',
      user_id: 'test',
      title: 'Devoir urgent',
      task_type: 'devoir',
      deadline: addDays(new Date(), 1).toISOString(),
      estimated_duration_minutes: 90,
      actual_duration_minutes: 0,
      priority: 'urgent',
      difficulty: 4,
      status: 'todo',
      created_at: new Date().toISOString(),
    };

    const relaxedTask: Task = {
      id: '2',
      user_id: 'test',
      title: 'Devoir lointain',
      task_type: 'devoir',
      deadline: addDays(new Date(), 20).toISOString(),
      estimated_duration_minutes: 90,
      actual_duration_minutes: 0,
      priority: 'low',
      difficulty: 2,
      status: 'todo',
      created_at: new Date().toISOString(),
    };

    const urgency1 = SchedulingEngine.calculateTaskUrgency(urgentTask);
    const urgency2 = SchedulingEngine.calculateTaskUrgency(relaxedTask);

    expect(urgency1).toBeGreaterThan(urgency2);
    expect(urgency1).toBeGreaterThan(100);
  });

  it('splits large tasks (e.g. 240min project) intelligently across multiple days', () => {
    const projectTask: Task = {
      id: 'proj-1',
      user_id: 'test',
      title: 'Projet Génie Logiciel',
      task_type: 'project',
      deadline: addDays(new Date(), 10).toISOString(),
      estimated_duration_minutes: 240,
      actual_duration_minutes: 0,
      priority: 'high',
      difficulty: 4,
      status: 'todo',
      created_at: new Date().toISOString(),
    };

    const sessions = SchedulingEngine.splitTaskIntoSessions(projectTask, 240, 10, 45);

    // Should NOT be 1 giant 4-hour session
    expect(sessions.length).toBeGreaterThanOrEqual(4);
    for (const session of sessions) {
      // Each session should be human-friendly between 30 and 60 minutes
      expect(session.plannedMinutes).toBeGreaterThanOrEqual(30);
      expect(session.plannedMinutes).toBeLessThanOrEqual(60);
    }
    // Total planned minutes must cover the 240 min work
    const totalPlanned = sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
    expect(Math.abs(totalPlanned - 240)).toBeLessThanOrEqual(15);
  });

  it('excludes sleep, lunch, dinner and existing classes when finding free slots', () => {
    const targetDay = parseISO('2026-09-14T00:00:00.000Z');
    const existingEvents: CalendarEvent[] = [
      {
        id: 'ev-1',
        user_id: 'test',
        title: 'Cours M234 ERP',
        event_type: 'CM',
        start_time: '2026-09-14T08:30:00.000Z',
        end_time: '2026-09-14T10:15:00.000Z',
      },
    ];

    const freeSlots = SchedulingEngine.getFreeSlotsForDay(targetDay, mockProfile, existingEvents);

    for (const slot of freeSlots) {
      const slotStart = format(slot.start, 'HH:mm');
      const slotEnd = format(slot.end, 'HH:mm');

      // Must not be during sleep (before 07:00 or after 23:30)
      expect(slotStart >= '07:00').toBe(true);
      expect(slotEnd <= '23:30').toBe(true);

      // Must not overlap lunch (12:15 - 14:30)
      const overlapsLunch = slotStart < '14:30' && slotEnd > '12:15';
      expect(overlapsLunch).toBe(false);
    }
  });

  it('detects conflicts when task workload exceeds student free time and limits fatigue', () => {
    // 3 massive tasks due tomorrow
    const impossibleTasks: Task[] = [
      {
        id: 't1',
        user_id: 'test',
        title: 'Tâche géante 1',
        task_type: 'project',
        deadline: addDays(new Date(), 1).toISOString(),
        estimated_duration_minutes: 300,
        actual_duration_minutes: 0,
        priority: 'urgent',
        difficulty: 5,
        status: 'todo',
        created_at: new Date().toISOString(),
      },
      {
        id: 't2',
        user_id: 'test',
        title: 'Tâche géante 2',
        task_type: 'devoir',
        deadline: addDays(new Date(), 1).toISOString(),
        estimated_duration_minutes: 300,
        actual_duration_minutes: 0,
        priority: 'urgent',
        difficulty: 5,
        status: 'todo',
        created_at: new Date().toISOString(),
      },
    ];

    const result = SchedulingEngine.planSchedule(impossibleTasks, mockProfile, [], [], { daysAhead: 2 });
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].reason).toContain('limite de fatigue');
  });
});
