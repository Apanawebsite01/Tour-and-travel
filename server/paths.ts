import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function ensureWritableDir(preferred: string, fallbackName: string): string {
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    const tmpDir = path.join(os.tmpdir(), fallbackName);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }

  try {
    if (!fs.existsSync(preferred)) {
      fs.mkdirSync(preferred, { recursive: true });
    }
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const tmpDir = path.join(os.tmpdir(), fallbackName);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

export function getDataDir(): string {
  return ensureWritableDir(path.resolve(process.cwd(), 'data'), 'travelgo-data');
}

export function getUploadsDir(): string {
  return ensureWritableDir(path.resolve(process.cwd(), 'uploads'), 'travelgo-uploads');
}
