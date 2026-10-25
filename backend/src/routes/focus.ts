import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { LearningEngine } from '../scheduling/learning';
import { SchedulingEngine } from '../scheduling/engine';
import { addDays } from 'date-fns';

export const focusRouter = Router();

focusRouter.get('/history', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, task:tasks(title, subject:subjects(code, name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ sessions: data || [] });
});

// Finish and log a focus session
focusRouter.post('/complete', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { taskId, sessionId, startTime, endTime, plannedMinutes, actualMinutes, taskCompleted, productivityRating, notes } = req.body;

  // 1. Insert into focus_sessions
  const { data: focusSession, error: sessionErr } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      task_id: taskId || null,
      session_id: sessionId || null,
      start_time: startTime || new Date(Date.now() - actualMinutes * 60 * 1000).toISOString(),
      end_time: endTime || new Date().toISOString(),
      planned_minutes: plannedMinutes || 45,
      actual_minutes: actualMinutes || 45,
      task_completed: Boolean(taskCompleted),
      productivity_rating: productivityRating || 4,
      notes: notes || null,
    })
    .select()
    .single();

  if (sessionErr) return res.status(400).json({ error: sessionErr.message });

  // 2. Update task actual_duration_minutes & completion status
  let taskUpdateResult = null;
  let rescheduleResult = null;

  if (taskId) {
    const { data: existingTask } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (existingTask) {
      const newActual = (existingTask.actual_duration_minutes || 0) + actualMinutes;
      const isComplete = Boolean(taskCompleted);

      await supabase
        .from('tasks')
        .update({
          actual_duration_minutes: newActual,
          status: isComplete ? 'completed' : 'in_progress',
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      // 3. Trigger Learning Engine to update subject/task-type velocity
      if (existingTask.subject_id) {
        await LearningEngine.recordSessionCompletion(
          userId,
          existingTask.subject_id,
          existingTask.task_type,
          plannedMinutes,
          actualMinutes
        );
      }

      // 4. Intelligent Rescheduling: if not completed and still remaining minutes
      const remainingMinutes = existingTask.estimated_duration_minutes - newActual;
      if (!isComplete && remainingMinutes > 15) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId);

        for (let d = 1; d <= 3; d++) {
          const targetDay = addDays(new Date(), d);
          const freeSlots = SchedulingEngine.getFreeSlotsForDay(targetDay, profile, events || [], { minSlotMinutes: Math.min(45, remainingMinutes) });
          if (freeSlots.length > 0) {
            const slot = freeSlots[0];
            const slotDuration = Math.min(45, remainingMinutes);
            const reschedEv = await supabase.from('calendar_events').insert({
              user_id: userId,
              title: `Rattrapage : ${existingTask.title} (${slotDuration}m)`,
              event_type: 'study_session',
              start_time: slot.start.toISOString(),
              end_time: new Date(slot.start.getTime() + slotDuration * 60 * 1000).toISOString(),
              notes: 'Séance de report automatique générée après session partielle',
            }).select().single();
            rescheduleResult = reschedEv.data;
            break;
          }
        }
      }
    }
  }

  res.status(201).json({
    focusSession,
    rescheduledSession: rescheduleResult,
  });
});
