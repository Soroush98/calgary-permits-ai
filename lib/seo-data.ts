import contractorsJson from "@/data/contractors.json";
import contractorPermitsJson from "@/data/contractor-permits.json";
import communitiesJson from "@/data/communities.json";
import communityDetailsJson from "@/data/community-details.json";

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

const allContractors = contractorsJson as ContractorSummary[];
const allCommunities = communitiesJson as CommunitySummary[];
const contractorPermits = contractorPermitsJson as Record<string, PermitRow[]>;
const communityDetails = communityDetailsJson as Record<
  string,
  { recent: PermitRow[]; topContractors: { name: string; count: number }[] }
>;

export async function getTopContractors(limit = 200): Promise<ContractorSummary[]> {
  return allContractors.slice(0, limit);
}

export async function getContractorBySlug(
  slug: string,
): Promise<{ summary: ContractorSummary; recent: PermitRow[] } | null> {
  const summary = allContractors.find((c) => c.slug === slug);
  if (!summary) return null;
  const recent = (contractorPermits[slug] ?? []) as PermitRow[];
  return { summary, recent };
}

export async function getTopCommunities(limit = 250): Promise<CommunitySummary[]> {
  return allCommunities.slice(0, limit);
}

export async function getCommunityBySlug(
  slug: string,
): Promise<{
  summary: CommunitySummary;
  recent: PermitRow[];
  topContractors: { name: string; count: number }[];
} | null> {
  const summary = allCommunities.find((c) => c.slug === slug);
  if (!summary) return null;
  const details = communityDetails[slug] ?? { recent: [], topContractors: [] };
  return { summary, recent: details.recent as PermitRow[], topContractors: details.topContractors };
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
