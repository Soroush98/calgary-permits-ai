import { questionToSql } from '@/lib/text2sql';
import { runSelect } from '@/lib/db';
import { supabaseServer } from '@/lib/supabase/server';
import { limitFor, type Plan } from '@/lib/plan';

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'auth_required' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();
  const plan: Plan = profile?.plan === 'pro' ? 'pro' : 'free';
  const limit = limitFor(plan);

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { count: used } = await supabase
    .from('query_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', periodStart.toISOString());

  const usedCount = used ?? 0;
  if (usedCount >= limit) {
    return Response.json(
      { error: 'quota_exceeded', plan, used: usedCount, limit },
      { status: 402 },
    );
  }

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
    await supabase.from('query_log').insert({ user_id: user.id, question, error: msg });
    return Response.json({ error: `LLM error: ${msg}` }, { status: 502 });
  }

  const result = await runSelect(sql);
  if (!result.ok) {
    await supabase.from('query_log').insert({ user_id: user.id, question, sql, error: result.error });
    return Response.json({
      sql,
      explanation,
      error: result.error,
      rows: [],
      plan,
      used: usedCount + 1,
      limit,
    });
  }

  await supabase.from('query_log').insert({
    user_id: user.id,
    question,
    sql,
    rows_returned: result.rows.length,
  });

  const truncated = result.rows.length < result.total;
  return Response.json({
    sql,
    explanation,
    rows: result.rows,
    total: result.total,
    truncated,
    plan,
    used: usedCount + 1,
    limit,
  });
}
