import { isAdmin } from '@/lib/admin';
import { runSelect } from '@/lib/db';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let sql: string;
  try {
    const body = await req.json();
    sql = String(body?.sql ?? '').trim();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!sql) return Response.json({ error: 'sql is required' }, { status: 400 });

  const result = await runSelect(sql);
  if (!result.ok) {
    return Response.json({ error: result.error, rows: [] });
  }
  return Response.json({
    rows: result.rows,
    total: result.total,
    truncated: result.rows.length < result.total,
  });
}
