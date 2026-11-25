import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getStore, saveStore, type ProfileRecord } from './store.ts';

function getSessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  // Deterministic per-deployment fallback so serverless instances verify tokens consistently
  const seed = process.env.VERCEL_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'travelgo-local-auth';
  return crypto.createHash('sha256').update(`${seed}:travelgo-session-v1`).digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function constantTimeEqualStr(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: 'admin';
  exp: number;
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'exp'>): string {
  const fullPayload: AdminTokenPayload = {
    ...payload,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  if (!constantTimeEqualStr(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (!parsed || parsed.role !== 'admin' || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }
  req.admin = payload;
  next();
}

export function getEnvAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

export async function getAdminProfile(): Promise<ProfileRecord | undefined> {
  const store = getStore();
  return store.profiles.find((p) => p.role === 'admin');
}

export function upsertAdminProfile(input: {
  id?: string;
  full_name: string;
  email: string;
  password_hash: string | null;
}): ProfileRecord {
  const store = getStore();
  const existing = store.profiles.find((p) => p.role === 'admin');
  if (existing) {
    existing.full_name = input.full_name;
    existing.email = input.email;
    existing.password_hash = input.password_hash;
    saveStore(store);
    return existing;
  }
  const created: ProfileRecord = {
    id: input.id || crypto.randomUUID(),
    full_name: input.full_name,
    email: input.email,
    role: 'admin',
    password_hash: input.password_hash,
    created_at: new Date().toISOString(),
  };
  store.profiles.push(created);
  saveStore(store);
  return created;
}
