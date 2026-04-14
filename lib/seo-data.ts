import { runSelect } from "./db";
import { toSlug, escapeSql } from "./slug";

export type ContractorSummary = {
  name: string;
  slug: string;
  permitCount: number;
  totalCost: number;
  housingUnits: number;
  firstDate: string | null;
  lastDate: string | null;
};

export type CommunitySummary = {
  name: string;
  slug: string;
  permitCount: number;
  totalCost: number;
  housingUnits: number;
};

export type PermitRow = {
  permitnum: string;
  originaladdress: string | null;
  communityname: string | null;
  contractorname: string | null;
  permittype: string | null;
  workclass: string | null;
  description: string | null;
  estprojectcost: number | null;
  issueddate: string | null;
  applieddate: string | null;
};

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

export async function getTopContractors(limit = 200): Promise<ContractorSummary[]> {
  const sql = `
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
    LIMIT ${limit}
  `;
  const res = await runSelect(sql);
  if (!res.ok) return [];
  return res.rows.map((r) => {
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
}

export async function getContractorBySlug(
  slug: string,
): Promise<{ summary: ContractorSummary; recent: PermitRow[] } | null> {
  const top = await getTopContractors(500);
  const summary = top.find((c) => c.slug === slug);
  if (!summary) return null;
  const recent = await getPermitsByContractor(summary.name, 50);
  return { summary, recent };
}

async function getPermitsByContractor(name: string, limit: number): Promise<PermitRow[]> {
  const safe = escapeSql(name);
  const sql = `
    SELECT permitnum, originaladdress, communityname, contractorname,
           permittype, workclass, description, estprojectcost,
           issueddate, applieddate
    FROM permits
    WHERE contractorname = '${safe}'
    ORDER BY applieddate DESC NULLS LAST
    LIMIT ${limit}
  `;
  const res = await runSelect(sql);
  if (!res.ok) return [];
  return res.rows as unknown as PermitRow[];
}

export async function getTopCommunities(limit = 250): Promise<CommunitySummary[]> {
  const sql = `
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
    LIMIT ${limit}
  `;
  const res = await runSelect(sql);
  if (!res.ok) return [];
  return res.rows.map((r) => {
    const name = String(r.name);
    return {
      name,
      slug: toSlug(name),
      permitCount: num(r.permit_count),
      totalCost: num(r.total_cost),
      housingUnits: num(r.housing_units),
    };
  });
}

export async function getCommunityBySlug(
  slug: string,
): Promise<{
  summary: CommunitySummary;
  recent: PermitRow[];
  topContractors: { name: string; count: number }[];
} | null> {
  const communities = await getTopCommunities(500);
  const summary = communities.find((c) => c.slug === slug);
  if (!summary) return null;

  const safe = escapeSql(summary.name);
  const [recentRes, contractorsRes] = await Promise.all([
    runSelect(`
      SELECT permitnum, originaladdress, communityname, contractorname,
             permittype, workclass, description, estprojectcost,
             issueddate, applieddate
      FROM permits
      WHERE communityname = '${safe}'
      ORDER BY applieddate DESC NULLS LAST
      LIMIT 50
    `),
    runSelect(`
      SELECT contractorname AS name, COUNT(*)::int AS count
      FROM permits
      WHERE communityname = '${safe}' AND contractorname IS NOT NULL
        AND btrim(contractorname) <> ''
      GROUP BY contractorname
      ORDER BY count DESC
      LIMIT 10
    `),
  ]);

  const recent = recentRes.ok ? (recentRes.rows as unknown as PermitRow[]) : [];
  const topContractors = contractorsRes.ok
    ? contractorsRes.rows.map((r) => ({ name: String(r.name), count: num(r.count) }))
    : [];

  return { summary, recent, topContractors };
}

export function fmtCurrency(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-CA").format(n);
}

export function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
