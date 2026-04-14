import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteShell";
import { getTopCommunities, fmtCurrency, fmtNum } from "@/lib/seo-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Calgary Communities — Building Permit Activity by Neighbourhood",
  description:
    "Every Calgary community ranked by building permit volume. See where the city is growing, how much is being invested, and who's building.",
  alternates: { canonical: "/communities" },
};

export default async function CommunitiesIndex() {
  const communities = await getTopCommunities(250);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {fmtNum(communities.length)} Calgary communities
        </div>

        <h1 className="fade-up delay-1 hero-title text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-4">
          Where Calgary<br />is being built.
        </h1>
        <p className="fade-up delay-2 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed">
          Permit activity by community — ranked so you can spot where construction is
          booming, where investment is concentrated, and which neighbourhoods are quiet.
        </p>

        <div className="fade-up delay-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communities.map((c) => (
            <Link
              key={c.slug}
              href={`/communities/${c.slug}`}
              className="glass rounded-2xl p-4 sm:p-5 hover:shadow-xl transition group"
            >
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="font-semibold tracking-tight break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition min-w-0">
                  {c.name}
                </div>
                <div className="text-xs text-zinc-500 tabular-nums shrink-0">{fmtNum(c.permitCount)}</div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{fmtCurrency(c.totalCost)}</span>
                <span>{fmtNum(c.housingUnits)} units</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
