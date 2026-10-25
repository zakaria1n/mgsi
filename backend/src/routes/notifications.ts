import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { SmartNotificationService } from '../notifications/smartNotifications';

export const notificationsRouter = Router();

notificationsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const notifs = await SmartNotificationService.evaluateAndGenerate(userId);
  res.json({ notifications: notifs });
});

notificationsRouter.post('/:id/read', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const notifId = req.params.id;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
    .eq('user_id', userId);

  res.json({ success: true });
});

notificationsRouter.post('/read-all', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  res.json({ success: true });
});
