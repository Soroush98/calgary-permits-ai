import { isAdmin } from '@/lib/admin';
import { questionToSql } from '@/lib/text2sql';
import { runSelect } from '@/lib/db';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let question: string;
  try {
    const body = await req.json();
    question = String(body?.question ?? '').trim();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!question) return Response.json({ error: 'question is required' }, { status: 400 });

  let sql: string;
  let explanation: string;
  try {
    const r = await questionToSql(question);
    if (!r.ok) {
      return Response.json({ error: r.reason, explanation: r.explanation, rows: [] }, { status: 400 });
    }
    sql = r.sql;
    explanation = r.explanation;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `LLM error: ${msg}` }, { status: 502 });
  }

  const result = await runSelect(sql);
  if (!result.ok) {
    return Response.json({ sql, explanation, error: result.error, rows: [] });
  }
  return Response.json({
    sql,
    explanation,
    rows: result.rows,
    total: result.total,
    truncated: result.rows.length < result.total,
  });
}
