import fs from 'node:fs';
import path from 'node:path';
import type { DecodedIdToken } from 'firebase-admin/auth';

function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    return process.env.VITE_FIREBASE_PROJECT_ID;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    }
  } catch {
    // Fallback to known project ID if config file is unavailable in serverless bundle
  }
  return 'helical-ace-lc62s';
}

export async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken> {
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);
  if (!getApps().length) {
    initializeApp({
      projectId: resolveFirebaseProjectId(),
    });
  }
  return getAuth().verifyIdToken(token);
}
