import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { authRouter } from './routes/auth';
import { tasksRouter } from './routes/tasks';
import { scheduleRouter } from './routes/schedule';
import { focusRouter } from './routes/focus';
import { examsRouter } from './routes/exams';
import { aiRouter } from './routes/ai';
import { notificationsRouter } from './routes/notifications';
import { statsRouter } from './routes/stats';
import { documentsRouter } from './routes/documents';

import path from 'path';
import fs from 'fs';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static local uploads folder for local audio storage
const uploadsDir = path.join(process.cwd(), 'uploads');
const audiosDir = path.join(uploadsDir, 'audios');
if (!fs.existsSync(audiosDir)) {
  fs.mkdirSync(audiosDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'MGSI Planner Backend',
    school: 'ENSIA-SD Taroudant',
    semester: 'S3 2026-2027',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/focus', focusRouter);
app.use('/api/exams', examsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/documents', documentsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Une erreur interne est survenue sur le serveur.',
    message: err.message,
  });
});

app.listen(ENV.PORT, () => {
  console.log(`🚀 MGSI Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
});
