import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteShell";
import { getTopContractors, fmtCurrency, fmtNum } from "@/lib/seo-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Top Calgary Contractors by Building Permit Volume",
  description:
    "Browse the most active contractors in Calgary ranked by total building permits. See project counts, total estimated costs, and housing units built.",
  alternates: { canonical: "/contractors" },
};

export default async function ContractorsIndex() {
  const contractors = await getTopContractors(200);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {fmtNum(contractors.length)} contractors ranked
        </div>

        <h1 className="fade-up delay-1 hero-title text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-4">
          Calgary&rsquo;s busiest<br />contractors.
        </h1>
        <p className="fade-up delay-2 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed">
          Ranked by the number of City of Calgary building permits they&rsquo;ve pulled.
          Click any contractor to see their full permit history, addresses, and project costs.
        </p>

        <div className="fade-up delay-3 glass rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/60 dark:border-white/10">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Contractor</div>
            <div className="col-span-2 text-right">Permits</div>
            <div className="col-span-3 text-right">Total value</div>
          </div>
          {contractors.map((c, i) => (
            <Link
              key={c.slug}
              href={`/contractors/${c.slug}`}
              className="flex sm:grid sm:grid-cols-12 sm:items-center gap-3 px-4 sm:px-5 py-3 text-sm border-b border-zinc-200/40 dark:border-white/5 last:border-0 hover:bg-white/40 dark:hover:bg-white/5 transition"
            >
              <div className="sm:col-span-1 text-zinc-400 font-mono text-xs w-6 shrink-0 pt-0.5 sm:pt-0">
                {i + 1}
              </div>
              <div className="sm:col-span-6 font-medium min-w-0 flex-1 break-words sm:truncate">
                {c.name}
                <div className="sm:hidden mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span>{fmtNum(c.permitCount)} permits</span>
                  <span>·</span>
                  <span>{fmtCurrency(c.totalCost)}</span>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right tabular-nums">
                {fmtNum(c.permitCount)}
              </div>
              <div className="hidden sm:block sm:col-span-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                {fmtCurrency(c.totalCost)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
