import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from './app.ts';

let appInstance: ReturnType<typeof createApiApp> | null = null;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!appInstance) {
      appInstance = createApiApp();
    }
    return appInstance(req as never, res as never);
  } catch (err) {
    console.error('Vercel handler boot error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server initialization failed' }));
    }
  }
}
