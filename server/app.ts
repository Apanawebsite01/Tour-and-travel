import 'dotenv/config';
import express from 'express';
import { initSchema } from './db.ts';
import { seedDatabase } from './seed.ts';
import { publicRouter } from './routes/public.ts';
import { adminRouter } from './routes/admin.ts';
import { getUploadsDir } from './paths.ts';

let initialized = false;

export function ensureInitialized(): void {
  if (!initialized) {
    initSchema();
    seedDatabase();
    initialized = true;
  }
}

export function createApiApp(): express.Express {
  ensureInitialized();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(getUploadsDir()));
  app.use('/api/public', publicRouter);
  app.use('/api/admin', adminRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  return app;
}
