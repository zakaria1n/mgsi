import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { differenceInDays, subDays } from 'date-fns';

export const examsRouter = Router();

examsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('exams')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('exam_date', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ exams: data || [] });
});

examsRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { subject_id, title, exam_date, duration_minutes, room, topics, difficulty, importance } = req.body;

  if (!title || !exam_date || !subject_id) {
    return res.status(400).json({ error: "Matière, titre et date d'examen sont requis." });
  }

  const { data, error } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      subject_id,
      title,
      exam_date: new Date(exam_date).toISOString(),
      duration_minutes: Number(duration_minutes) || 120,
      room: room || null,
      topics: topics || null,
      difficulty: Number(difficulty) || 3,
      importance: importance || 'high',
      revision_status: 'pending',
    })
    .select('*, subject:subjects(*)')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Also add calendar event for the exam itself
  await supabase.from('calendar_events').insert({
    user_id: userId,
    subject_id,
    title: `[EXAMEN] ${title}`,
    event_type: 'exam',
    start_time: new Date(exam_date).toISOString(),
    end_time: new Date(new Date(exam_date).getTime() + (Number(duration_minutes) || 120) * 60 * 1000).toISOString(),
    room: room || null,
  });

  res.status(201).json({ exam: data });
});

examsRouter.post('/:id/generate-revision', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const examId = req.params.id;

  const { data: exam } = await supabase
    .from('exams')
    .select('*, subject:subjects(*)')
    .eq('id', examId)
    .eq('user_id', userId)
    .single();

  if (!exam) return res.status(404).json({ error: 'Examen introuvable' });

  const examDate = new Date(exam.exam_date);
  const now = new Date();
  const daysUntilExam = differenceInDays(examDate, now);

  const phases = [
    { name: 'Compréhension & Fiches de synthèse des chapitres', daysBefore: Math.round(daysUntilExam * 0.75), duration: 60 },
    { name: "Série d'exercices fondamentaux & TD types", daysBefore: Math.round(daysUntilExam * 0.50), duration: 60 },
    { name: 'Approfondissement des cas complexes & Annales', daysBefore: Math.round(daysUntilExam * 0.25), duration: 75 },
    { name: 'Révision éclair & Test en conditions réelles', daysBefore: 1, duration: 45 },
  ];

  const createdTasks: any[] = [];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseDeadline = subDays(examDate, phase.daysBefore);
    if (phaseDeadline > now) {
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          subject_id: exam.subject_id,
          title: `Révision ${exam.subject?.code} - Phase ${i + 1} : ${phase.name}`,
          description: `Préparation progressive pour l'examen "${exam.title}"`,
          task_type: 'revision',
          deadline: phaseDeadline.toISOString(),
          estimated_duration_minutes: phase.duration,
          priority: i >= 2 ? 'urgent' : 'high',
          difficulty: exam.difficulty,
          status: 'todo',
        })
        .select()
        .single();

      if (task) createdTasks.push(task);
    }
  }

  await supabase
    .from('exams')
    .update({ revision_status: 'in_progress' })
    .eq('id', examId);

  res.json({
    success: true,
    message: `${createdTasks.length} étapes de révision progressive créées avec succès.`,
    createdTasks,
  });
});
