import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../_components/SiteShell";
import {
  getCommunityBySlug,
  fmtCurrency,
  fmtNum,
  fmtDate,
} from "@/lib/seo-data";
import { toSlug } from "@/lib/slug";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCommunityBySlug(slug);
  if (!data) return { title: "Community not found" };
  const { summary } = data;
  const title = `${summary.name}, Calgary — Building Permits & Development`;
  const description = `${fmtNum(summary.permitCount)} building permits worth ${fmtCurrency(summary.totalCost)} total have been issued in ${summary.name}, Calgary. Browse contractors, costs, and projects.`;
  return {
    title,
    description,
    alternates: { canonical: `/communities/${slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCommunityBySlug(slug);
  if (!data) notFound();
  const { summary, recent, topContractors } = data;

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 fade-up">
          <Link href="/communities" className="hover:underline">Communities</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900 dark:text-zinc-100">{summary.name}</span>
        </nav>

        <h1 className="fade-up delay-1 hero-title text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-4 break-words">
          {summary.name}
        </h1>
        <p className="fade-up delay-2 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8 sm:mb-10">
          Building permit activity in {summary.name}, Calgary — every project, contractor,
          and dollar on file.
        </p>

        <div className="fade-up delay-3 grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          <Stat label="Permits" value={fmtNum(summary.permitCount)} />
          <Stat label="Total value" value={fmtCurrency(summary.totalCost)} />
          <Stat label="Housing units" value={fmtNum(summary.housingUnits)} />
        </div>

        {topContractors.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Most active contractors
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {topContractors.map((c) => (
                <Link
                  key={c.name}
                  href={`/contractors/${toSlug(c.name)}`}
                  className="flex items-center justify-between glass rounded-xl px-4 py-3 text-sm hover:shadow-lg transition"
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="text-xs text-zinc-500 tabular-nums ml-3 shrink-0">
                    {fmtNum(c.count)} permits
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent permits</h2>
        <div className="glass rounded-2xl overflow-hidden mb-10">
          {recent.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500 text-center">No recent permits.</div>
          ) : (
            recent.map((p) => (
              <div
                key={p.permitnum}
                className="px-4 sm:px-5 py-4 border-b border-zinc-200/40 dark:border-white/5 last:border-0 text-sm"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-words">{p.originaladdress ?? "—"}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {[p.contractorname, p.permittype, p.workclass].filter(Boolean).join(" · ")}
                    </div>
                    {p.description && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                        {p.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium tabular-nums">
                      {fmtCurrency(Number(p.estprojectcost) || 0)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {fmtDate(p.applieddate)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            Want to slice {summary.name}&rsquo;s data by year, permit type, or cost?
          </p>
          <Link
            href={`/?q=${encodeURIComponent(`permits in ${summary.name} grouped by year`)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition"
          >
            Query {summary.name} →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] backdrop-blur-sm">
      <div className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1">
        {label}
      </div>
    </div>
  );
}
