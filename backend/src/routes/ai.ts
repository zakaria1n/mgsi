import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';
import { geminiService } from '../ai/gemini';

export const aiRouter = Router();

aiRouter.get('/history', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ messages: data || [] });
});

aiRouter.post('/chat', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message requis.' });
  }

  // 1. Record user message
  await supabase.from('ai_messages').insert({
    user_id: userId,
    role: 'user',
    content: message,
  });

  // 2. Fetch past conversation context (last 6 turns)
  const { data: pastMsgs } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);

  const formattedHistory = (pastMsgs || [])
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

  // 3. Process via Gemini AI with tool execution loop
  const response = await geminiService.chat(userId, message, formattedHistory);

  // 4. Save AI response
  await supabase.from('ai_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: response.reply,
    tool_calls: response.toolExecutions.length > 0 ? response.toolExecutions : null,
  });

  res.json({
    reply: response.reply,
    toolExecutions: response.toolExecutions,
  });
});

aiRouter.delete('/history', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { error } = await supabase.from('ai_messages').delete().eq('user_id', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

