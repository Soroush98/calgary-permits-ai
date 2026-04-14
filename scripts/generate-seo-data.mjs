// Dumps contractor and community aggregate data from the DB into static JSON
// so the Next.js build never needs a live DB connection for SEO pages.
//
// Usage:  node scripts/generate-seo-data.mjs
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from .env.local.

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

const URL  = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

async function runSelect(sql) {
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
  if (!res.ok) throw new Error(`DB error: ${text}`);
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function num(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v) {
  return v === null || v === undefined ? null : String(v);
}

function escapeSql(s) {
  return s.replace(/'/g, "''");
}

async function main() {
  console.log('Fetching top contractors…');
  const contractorRows = await runSelect(`
    SELECT contractorname AS name,
           COUNT(*)::int AS permit_count,
           COALESCE(SUM(estprojectcost), 0)::numeric AS total_cost,
           COALESCE(SUM(housingunits), 0)::numeric AS housing_units,
           MIN(applieddate) AS first_date,
           MAX(applieddate) AS last_date
    FROM permits
    WHERE contractorname IS NOT NULL
      AND btrim(contractorname) <> ''
      AND contractorname NOT ILIKE '%homeowner - generic%'
    GROUP BY contractorname
    ORDER BY permit_count DESC
    LIMIT 500
  `);

  const contractors = contractorRows.map((r) => {
    const name = String(r.name);
    return {
      name,
      slug: toSlug(name),
      permitCount: num(r.permit_count),
      totalCost: num(r.total_cost),
      housingUnits: num(r.housing_units),
      firstDate: str(r.first_date),
      lastDate: str(r.last_date),
    };
  });
  console.log(`  → ${contractors.length} contractors`);

  // Fetch recent permits for each contractor (top 200 only to keep size reasonable)
  console.log('Fetching recent permits per contractor (top 200)…');
  const contractorPermits = {};
  for (const c of contractors.slice(0, 200)) {
    const safe = escapeSql(c.name);
    const rows = await runSelect(`
      SELECT permitnum, originaladdress, communityname, contractorname,
             permittype, workclass, description, estprojectcost,
             issueddate, applieddate
      FROM permits
      WHERE contractorname = '${safe}'
      ORDER BY applieddate DESC NULLS LAST
      LIMIT 50
    `);
    contractorPermits[c.slug] = rows;
  }
  console.log(`  → fetched permits for ${Object.keys(contractorPermits).length} contractors`);

  console.log('Fetching top communities…');
  const communityRows = await runSelect(`
    SELECT communityname AS name,
           COUNT(*)::int AS permit_count,
           COALESCE(SUM(estprojectcost), 0)::numeric AS total_cost,
           COALESCE(SUM(housingunits), 0)::numeric AS housing_units
    FROM permits
    WHERE communityname IS NOT NULL
      AND btrim(communityname) <> ''
      AND upper(communityname) NOT IN ('N/A', 'UNKNOWN', 'NONE')
    GROUP BY communityname
    ORDER BY permit_count DESC
    LIMIT 500
  `);

  const communities = communityRows.map((r) => {
    const name = String(r.name);
    return {
      name,
      slug: toSlug(name),
      permitCount: num(r.permit_count),
      totalCost: num(r.total_cost),
      housingUnits: num(r.housing_units),
    };
  });
  console.log(`  → ${communities.length} communities`);

  // Fetch recent permits + top contractors per community (sequential with delay to avoid rate limits)
  console.log('Fetching recent permits & top contractors per community…');
  const communityDetails = {};
  for (let i = 0; i < communities.length; i++) {
    const c = communities[i];
    const safe = escapeSql(c.name);
    if (i > 0 && i % 10 === 0) {
      console.log(`  … ${i}/${communities.length}`);
      await new Promise((r) => setTimeout(r, 500));
    }
    try {
      const recentRows = await runSelect(`
        SELECT permitnum, originaladdress, communityname, contractorname,
               permittype, workclass, description, estprojectcost,
               issueddate, applieddate
        FROM permits
        WHERE communityname = '${safe}'
        ORDER BY applieddate DESC NULLS LAST
        LIMIT 50
      `);
      const contractorRows = await runSelect(`
        SELECT contractorname AS name, COUNT(*)::int AS count
        FROM permits
        WHERE communityname = '${safe}' AND contractorname IS NOT NULL
          AND btrim(contractorname) <> ''
        GROUP BY contractorname
        ORDER BY count DESC
        LIMIT 10
      `);
      communityDetails[c.slug] = {
        recent: recentRows,
        topContractors: contractorRows.map((r) => ({
          name: String(r.name),
          count: num(r.count),
        })),
      };
    } catch (err) {
      console.warn(`  ⚠ skipped ${c.name}: ${err.message}`);
      communityDetails[c.slug] = { recent: [], topContractors: [] };
    }
  }
  console.log(`  → fetched details for ${Object.keys(communityDetails).length} communities`);

  const dataDir = path.join(process.cwd(), 'data');

  fs.writeFileSync(
    path.join(dataDir, 'contractors.json'),
    JSON.stringify(contractors, null, 2),
  );
  fs.writeFileSync(
    path.join(dataDir, 'contractor-permits.json'),
    JSON.stringify(contractorPermits, null, 2),
  );
  fs.writeFileSync(
    path.join(dataDir, 'communities.json'),
    JSON.stringify(communities, null, 2),
  );
  fs.writeFileSync(
    path.join(dataDir, 'community-details.json'),
    JSON.stringify(communityDetails, null, 2),
  );

  console.log('Done! Static SEO data written to data/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
