import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { SchedulingEngine } from '../scheduling/engine';
import { LearningEngine } from '../scheduling/learning';
import { Task } from '../types';

export const tasksRouter = Router();

tasksRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subject:subjects(*), sessions:task_sessions(*)')
    .eq('user_id', userId)
    .order('deadline', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });

  const tasksWithUrgency = (data as Task[]).map((task) => ({
    ...task,
    calculated_urgency: SchedulingEngine.calculateTaskUrgency(task),
  }));

  res.json({ tasks: tasksWithUrgency });
});

tasksRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const {
    title,
    description,
    subject_id,
    task_type,
    deadline,
    estimated_duration_minutes,
    priority,
    difficulty,
    notes,
    new_subject_name,
    new_subject_code,
    new_subject_color,
  } = req.body;

  if (!title || !deadline) {
    return res.status(400).json({ error: "Le titre et l'échéance sont obligatoires." });
  }

  let finalSubjectId = subject_id;

  // If user requested to create a new subject inline
  if ((subject_id === '__new__' || !subject_id) && new_subject_name && new_subject_name.trim()) {
    const trimmedName = new_subject_name.trim();
    const generatedCode = (new_subject_code || trimmedName.slice(0, 4)).trim().toUpperCase();
    const subjectColor = new_subject_color || '#6366f1';

    const { data: newSubject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        code: generatedCode,
        name: trimmedName,
        color: subjectColor,
        is_default: false,
        is_official: false,
      })
      .select()
      .single();

    if (!subjectError && newSubject) {
      finalSubjectId = newSubject.id;
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      subject_id: finalSubjectId && finalSubjectId !== '__new__' ? finalSubjectId : null,
      task_type: task_type || 'devoir',
      deadline: new Date(deadline).toISOString(),
      estimated_duration_minutes: Number(estimated_duration_minutes) || 45,
      priority: priority || 'medium',
      difficulty: Number(difficulty) || 3,
      notes: notes || null,
      status: 'todo',
    })
    .select('*, subject:subjects(*)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ task: data });
});

tasksRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;

  const { data, error } = await supabase
    .from('tasks')
    .update(req.body)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('*, subject:subjects(*)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ task: data });
});

tasksRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, deletedId: taskId });
});

tasksRouter.post('/:id/complete', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ task: data });
});

tasksRouter.get('/:id/split-preview', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;

  const { data: task } = await supabase
    .from('tasks')
    .select('*, subject:subjects(*)')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const velocity = await LearningEngine.getUserVelocity(userId);

  const adjustedDuration = SchedulingEngine.getAdjustedDuration(task, velocity);
  const daysAvailable = Math.max(1, Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (24 * 3600 * 1000)));

  const splitPlan = SchedulingEngine.splitTaskIntoSessions(
    task,
    adjustedDuration,
    daysAvailable,
    profile?.preferred_session_minutes || 45
  );

  res.json({
    originalEstimatedMinutes: task.estimated_duration_minutes,
    adjustedDurationMinutes: adjustedDuration,
    daysAvailable,
    sessionsPlan: splitPlan,
  });
});
