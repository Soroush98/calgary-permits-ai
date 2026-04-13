// Pulls Calgary Building Permits from Socrata and upserts into Supabase.
// Usage:  node scripts/ingest.mjs           (full load, resumable via upsert)
//         node scripts/ingest.mjs --since=2026-04-01   (delta by applieddate)
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import fs from 'node:fs';
import path from 'node:path';

// --- tiny .env.local loader (no deps) ---
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const SOCRATA_URL   = 'https://data.calgary.ca/resource/c2es-76ed.json';
const SOCRATA_PAGE  = 50000;     // Socrata max $limit
const UPSERT_BATCH  = 1000;      // rows per PostgREST POST

const sinceArg = process.argv.find(a => a.startsWith('--since='));
const sinceIso = sinceArg ? sinceArg.split('=')[1] : null;

const COLUMNS = [
  'permitnum','statuscurrent','applieddate','issueddate','completeddate',
  'permittype','permittypemapped','permitclass','permitclassgroup','permitclassmapped',
  'workclass','workclassgroup','workclassmapped','description',
  'applicantname','contractorname','housingunits','estprojectcost','totalsqft',
  'originaladdress','communitycode','communityname','latitude','longitude',
  'locationcount','locationtypes','locationaddresses','locationswkt',
];
const NUMERIC  = new Set(['housingunits','estprojectcost','totalsqft','latitude','longitude','locationcount']);
const DATES    = new Set(['applieddate','issueddate','completeddate']);

function clean(row) {
  const out = {};
  for (const c of COLUMNS) {
    let v = row[c];
    if (v === undefined || v === null || v === '') { out[c] = null; continue; }
    if (NUMERIC.has(c))  { const n = Number(v); out[c] = Number.isFinite(n) ? n : null; continue; }
    if (DATES.has(c))    { out[c] = v; continue; } // Socrata returns ISO8601
    out[c] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

async function fetchPage(offset) {
  const params = new URLSearchParams({
    $limit: String(SOCRATA_PAGE),
    $offset: String(offset),
    $order: 'applieddate ASC',
  });
  if (sinceIso) params.set('$where', `applieddate >= '${sinceIso}'`);
  const url = `${SOCRATA_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Socrata ${res.status}: ${await res.text()}`);
  return res.json();
}

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/permits?on_conflict=permitnum`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert ${res.status}: ${body.slice(0, 500)}`);
  }
}

async function logRun(runId, patch) {
  const url = runId
    ? `${SUPABASE_URL}/rest/v1/ingest_runs?id=eq.${runId}`
    : `${SUPABASE_URL}/rest/v1/ingest_runs`;
  const res = await fetch(url, {
    method: runId ? 'PATCH' : 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`ingest_runs ${res.status}: ${await res.text()}`);
  const arr = await res.json();
  return arr[0]?.id;
}

const t0 = Date.now();
const runId = await logRun(null, { notes: sinceIso ? `delta since ${sinceIso}` : 'full load' });
let offset = 0;
let total = 0;
let maxApplied = null;

while (true) {
  const page = await fetchPage(offset);
  if (page.length === 0) break;
  console.log(`[fetch] offset=${offset} rows=${page.length}`);

  for (let i = 0; i < page.length; i += UPSERT_BATCH) {
    const slice = page.slice(i, i + UPSERT_BATCH).map(clean);
    await upsertBatch(slice);
    total += slice.length;
    for (const r of slice) if (r.applieddate && (!maxApplied || r.applieddate > maxApplied)) maxApplied = r.applieddate;
    process.stdout.write(`  [upsert] ${total.toLocaleString()} total\r`);
  }

  offset += page.length;
  if (page.length < SOCRATA_PAGE) break;
}

await logRun(runId, {
  finished_at: new Date().toISOString(),
  rows_upserted: total,
  max_applieddate: maxApplied,
});

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nDone. Upserted ${total.toLocaleString()} rows in ${secs}s. Max applieddate=${maxApplied}`);
