#!/usr/bin/env node
// Generates data/seo-snapshot.json — run manually when you want fresh data.
// Usage:  node scripts/snapshot-seo.mjs
// Requires SUPABASE_URL and SUPABASE_ANON_KEY in .env.local.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Tiny .env.local loader (no external deps).
const env = {};
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const URL_ = env.SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

async function runSelect(q) {
  const res = await fetch(`${URL_}/rest/v1/rpc/run_select`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed: ${text}`);
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
function escapeSql(s) {
  return s.replace(/'/g, "''");
}
function num(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v) {
  return v === null || v === undefined ? null : String(v);
}

const CONTRACTOR_LIMIT = 200;
const COMMUNITY_LIMIT = 250;
const RECENT_PERMITS = 25;

console.log("Fetching top contractors…");
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
  LIMIT ${CONTRACTOR_LIMIT}
`);

const contractors = [];
for (let i = 0; i < contractorRows.length; i++) {
  const r = contractorRows[i];
  const name = String(r.name);
  const slug = toSlug(name);
  const recent = await runSelect(`
    SELECT permitnum, originaladdress, communityname, contractorname,
           permittype, workclass, description, estprojectcost, applieddate
    FROM permits
    WHERE contractorname = '${escapeSql(name)}'
    ORDER BY applieddate DESC NULLS LAST
    LIMIT ${RECENT_PERMITS}
  `);
  contractors.push({
    name,
    slug,
    permitCount: num(r.permit_count),
    totalCost: num(r.total_cost),
    housingUnits: num(r.housing_units),
    firstDate: str(r.first_date),
    lastDate: str(r.last_date),
    recent: recent.map((p) => ({
      permitnum: String(p.permitnum),
      originaladdress: str(p.originaladdress),
      communityname: str(p.communityname),
      permittype: str(p.permittype),
      workclass: str(p.workclass),
      description: str(p.description),
      estprojectcost: num(p.estprojectcost),
      applieddate: str(p.applieddate),
    })),
  });
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${contractorRows.length}`);
}

console.log("Fetching top communities…");
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
  LIMIT ${COMMUNITY_LIMIT}
`);

const communities = [];
for (let i = 0; i < communityRows.length; i++) {
  const r = communityRows[i];
  const name = String(r.name);
  const slug = toSlug(name);
  const [recent, tops] = await Promise.all([
    runSelect(`
      SELECT permitnum, originaladdress, communityname, contractorname,
             permittype, workclass, description, estprojectcost, applieddate
      FROM permits
      WHERE communityname = '${escapeSql(name)}'
      ORDER BY applieddate DESC NULLS LAST
      LIMIT ${RECENT_PERMITS}
    `),
    runSelect(`
      SELECT contractorname AS name, COUNT(*)::int AS count
      FROM permits
      WHERE communityname = '${escapeSql(name)}' AND contractorname IS NOT NULL
        AND btrim(contractorname) <> ''
      GROUP BY contractorname
      ORDER BY count DESC
      LIMIT 10
    `),
  ]);
  communities.push({
    name,
    slug,
    permitCount: num(r.permit_count),
    totalCost: num(r.total_cost),
    housingUnits: num(r.housing_units),
    recent: recent.map((p) => ({
      permitnum: String(p.permitnum),
      originaladdress: str(p.originaladdress),
      communityname: str(p.communityname),
      contractorname: str(p.contractorname),
      permittype: str(p.permittype),
      workclass: str(p.workclass),
      description: str(p.description),
      estprojectcost: num(p.estprojectcost),
      applieddate: str(p.applieddate),
    })),
    topContractors: tops.map((t) => ({ name: String(t.name), count: num(t.count) })),
  });
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${communityRows.length}`);
}

const out = {
  generatedAt: new Date().toISOString(),
  contractors,
  communities,
};
const outPath = path.join(ROOT, "data", "seo-snapshot.json");
fs.writeFileSync(outPath, JSON.stringify(out));
const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`\nWrote ${outPath} (${sizeKb} KB)`);
console.log(`  ${contractors.length} contractors, ${communities.length} communities`);
