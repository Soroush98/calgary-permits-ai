import { questionToSql } from '@/lib/text2sql';
import { runSelect } from '@/lib/db';

export async function POST(req: Request) {
  let question: string;
  try {
    const body = await req.json();
    question = String(body?.question ?? '').trim();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!question) return Response.json({ error: 'question is required' }, { status: 400 });
  if (question.length > 500) return Response.json({ error: 'question too long' }, { status: 400 });

  let sql: string;
  let explanation: string;
  try {
    ({ sql, explanation } = await questionToSql(question));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `LLM error: ${msg}` }, { status: 502 });
  }

  const result = await runSelect(sql);
  if (!result.ok) {
    return Response.json({ sql, explanation, error: result.error, rows: [] }, { status: 200 });
  }
  const truncated = result.rows.length < result.total;
  return Response.json({ sql, explanation, rows: result.rows, total: result.total, truncated });
}
