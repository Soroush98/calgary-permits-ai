import { cookies } from 'next/headers';
import { timingSafeEqual, createHmac } from 'node:crypto';

export const ADMIN_COOKIE = 'admin_session';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function adminSlug(): string {
  return required('ADMIN_SLUG');
}

export function adminBasePath(): string {
  return `/admin-${adminSlug()}`;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyCredentials(user: string, password: string): boolean {
  return safeEqual(user, required('ADMIN_USER')) && safeEqual(password, required('ADMIN_PASSWORD'));
}

export function signSession(): string {
  return createHmac('sha256', required('ADMIN_SESSION_SECRET')).update('admin').digest('base64url');
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return safeEqual(token, signSession());
}
