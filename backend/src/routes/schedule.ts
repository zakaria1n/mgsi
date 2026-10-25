import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { SchedulingEngine } from '../scheduling/engine';
import { LearningEngine } from '../scheduling/learning';
import { parseISO } from 'date-fns';

export const scheduleRouter = Router();

scheduleRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { start, end } = req.query;

  let query = supabase
    .from('calendar_events')
    .select('*, subject:subjects(*)')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`)
    .order('start_time', { ascending: true })
    .limit(5000);

  if (start) query = query.gte('end_time', String(start));
  if (end) query = query.lte('start_time', String(end));

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  res.json({ events: data || [] });
});

scheduleRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, event_type, start_time, end_time, room, professor, notes, subject_id } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'Titre, date de début et fin sont obligatoires.' });
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      subject_id: subject_id || null,
      title,
      event_type: event_type || 'personal',
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      room: room || null,
      professor: professor || null,
      notes: notes || null,
      is_official: false,
    })
    .select('*, subject:subjects(*)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ event: data });
});

scheduleRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const eventId = req.params.id;

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, deletedId: eventId });
});

scheduleRouter.get('/free-slots', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`);

  const slots = SchedulingEngine.getFreeSlotsForDay(
    parseISO(dateStr),
    profile,
    events || []
  );

  res.json({ date: dateStr, freeSlots: slots });
});

scheduleRouter.post('/organize', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const daysAhead = Number(req.body.daysAhead) || 7;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const { data: tasks } = await supabase.from('tasks').select('*, subject:subjects(*)').eq('user_id', userId);
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`);
  const velocity = await LearningEngine.getUserVelocity(userId);

  // Clean old planned study sessions to avoid duplicating plans
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('event_type', 'study_session')
    .gte('start_time', new Date().toISOString());

  const plan = SchedulingEngine.planSchedule(
    tasks || [],
    profile,
    events?.filter((e) => e.event_type !== 'study_session') || [],
    velocity,
    { daysAhead }
  );

  const createdSessions: any[] = [];
  for (const s of plan.sessionsToCreate) {
    const { data: ev } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title: s.title,
        event_type: 'study_session',
        start_time: s.startTime,
        end_time: s.endTime,
        notes: `Séance planifiée automatiquement (${s.plannedMinutes} min)`,
      })
      .select()
      .single();

    if (ev) createdSessions.push(ev);
  }

  res.json({
    success: true,
    createdSessions,
    conflicts: plan.conflicts,
    summary: plan.summary,
  });
});
