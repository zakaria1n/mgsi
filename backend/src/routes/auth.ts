import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const authRouter = Router();

// Middleware to extract user from Supabase auth header
export const authenticate = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo/dev convenience: if no token, check query/header for fallback demo user
    const demoUserId = req.headers['x-user-id'] as string;
    if (demoUserId) {
      (req as any).user = { id: demoUserId };
      return next();
    }
    // Default demo user ID
    (req as any).user = { id: 'bb422935-714e-4ff2-8b7a-0e7f8ccc7c1b' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Session expirée ou non autorisée' });
  }

  (req as any).user = user;
  next();
};

// Get current profile (with auto-provisioning fallback)
authRouter.get('/profile', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user.id;
  let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (!data) {
    const email = user.email || 'etudiant.mgsi@ensia.ma';
    const fullName = user.user_metadata?.full_name || email.split('@')[0];
    const tpGroup = user.user_metadata?.tp_group || 'G1';

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        filiere: 'MGSI',
        semester: 'S3',
        tp_group: tpGroup,
      })
      .select()
      .single();

    if (createError) return res.status(400).json({ error: createError.message });
    data = created;
  }

  res.json({ profile: data });
});

// Update profile preferences (sleep, meals, TP group)
authRouter.put('/profile', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const {
    tp_group,
    sleep_start,
    sleep_end,
    lunch_start,
    lunch_end,
    dinner_start,
    dinner_end,
    preferred_session_minutes,
    max_daily_study_hours,
    audio_storage_mode,
    local_audio_folder,
    focus_sound_type,
    focus_sound_url,
    focus_sound_title,
    focus_custom_sounds,
  } = req.body;

  const updatePayload: Record<string, any> = {
    tp_group,
    sleep_start,
    sleep_end,
    lunch_start,
    lunch_end,
    dinner_start,
    dinner_end,
    preferred_session_minutes,
    max_daily_study_hours,
    updated_at: new Date().toISOString(),
  };

  if (audio_storage_mode !== undefined) updatePayload.audio_storage_mode = audio_storage_mode;
  if (local_audio_folder !== undefined) updatePayload.local_audio_folder = local_audio_folder;
  if (focus_sound_type !== undefined) updatePayload.focus_sound_type = focus_sound_type;
  if (focus_sound_url !== undefined) updatePayload.focus_sound_url = focus_sound_url;
  if (focus_sound_title !== undefined) updatePayload.focus_sound_title = focus_sound_title;
  if (focus_custom_sounds !== undefined) updatePayload.focus_custom_sounds = focus_custom_sounds;

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data });
});
