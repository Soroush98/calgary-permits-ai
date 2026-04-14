import { cookies } from 'next/headers';
import { ADMIN_COOKIE, signSession, verifyCredentials } from '@/lib/admin';

export async function POST(req: Request) {
  let body: { user?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const user = typeof body.user === 'string' ? body.user : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifyCredentials(user, password)) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, signSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return Response.json({ ok: true });
}
