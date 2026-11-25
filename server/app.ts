import 'dotenv/config';
import express from 'express';
import { seedDatabase } from './seed.ts';
import { publicRouter } from './routes/public.ts';
import { adminRouter } from './routes/admin.ts';
import { getUploadsDir } from './paths.ts';

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedDatabase().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

export function createApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(getUploadsDir()));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use('/api', async (_req, res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(503).json({ error: 'Database service temporarily unavailable. Please try again.' });
    }
  });

  app.use('/api/public', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
