import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { LearningEngine } from '../scheduling/learning';

export const statsRouter = Router();

statsRouter.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 0. User profile & TP group
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('tp_group')
    .eq('id', userId)
    .maybeSingle();
  const userTpGroup = userProfile?.tp_group || 'G1';

  // 1. Next class (official school events + personal events)
  const { data: upcomingEvents } = await supabase
    .from('calendar_events')
    .select('*, subject:subjects(*)')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`)
    .gte('start_time', now.toISOString())
    .order('start_time', { ascending: true })
    .limit(10);

  const nextClass = upcomingEvents?.find((e) => {
    if (!['CM', 'TD', 'TP'].includes(e.event_type)) return false;
    if (e.event_type === 'TP' && e.tp_group && e.tp_group !== userTpGroup) return false;
    if (e.title.includes('TP G1') && userTpGroup !== 'G1') return false;
    if (e.title.includes('TP G2') && userTpGroup !== 'G2') return false;
    return true;
  }) || null;

  // 2. Today's scheduled sessions
  const todayStart = `${todayStr}T00:00:00.000Z`;
  const todayEnd = `${todayStr}T23:59:59.999Z`;
  const { data: todaySessions } = await supabase
    .from('calendar_events')
    .select('*, subject:subjects(*)')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  const filteredTodaySessions = todaySessions?.filter((e) => {
    if (e.event_type === 'TP' && e.tp_group && e.tp_group !== userTpGroup) return false;
    if (e.title.includes('TP G1') && userTpGroup !== 'G1') return false;
    if (e.title.includes('TP G2') && userTpGroup !== 'G2') return false;
    return true;
  }) || [];

  // 3. Urgent / Important tasks
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .neq('status', 'completed')
    .order('deadline', { ascending: true })
    .limit(5);

  // 4. Next upcoming exam
  const { data: nextExams } = await supabase
    .from('exams')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .gte('exam_date', now.toISOString())
    .order('exam_date', { ascending: true })
    .limit(1);

  // 5. Velocity stats
  const velocity = await LearningEngine.getUserVelocity(userId);

  // 6. Focus stats (total minutes focused this week)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: recentFocus } = await supabase
    .from('focus_sessions')
    .select('actual_minutes')
    .eq('user_id', userId)
    .gte('created_at', weekAgo);

  const totalFocusMinutesThisWeek = recentFocus?.reduce((acc, f) => acc + (f.actual_minutes || 0), 0) || 0;

  res.json({
    nextClass,
    todayEvents: filteredTodaySessions,
    todayPriorities: pendingTasks || [],
    nextExam: nextExams?.[0] || null,
    velocity,
    totalFocusMinutesThisWeek,
  });
});

statsRouter.get('/subjects', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .or(`is_official.eq.true,user_id.is.null,user_id.eq.${userId}`)
    .order('code', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ subjects: data || [] });
});

statsRouter.post('/subjects', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { name, code, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le nom de la matière est obligatoire.' });
  }

  const trimmedName = name.trim();
  const generatedCode = (code || trimmedName.slice(0, 4)).trim().toUpperCase();
  const subjectColor = color || '#6366f1';

  const { data, error } = await supabase
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

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ subject: data });
});
