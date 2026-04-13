const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;

export type RunSelectResult =
  | { ok: true; rows: Record<string, unknown>[]; total: number }
  | { ok: false; error: string };

export async function runSelect(sql: string): Promise<RunSelectResult> {
  const res = await fetch(`${URL}/rest/v1/rpc/run_select`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message ?? text; } catch {}
    return { ok: false, error: msg };
  }
  const parsed = JSON.parse(text);
  // New RPC returns {rows, total}; old RPC returns a flat array
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : parsed.rows;
  const total: number = Array.isArray(parsed) ? rows.length : parsed.total;
  return { ok: true, rows, total };
}
