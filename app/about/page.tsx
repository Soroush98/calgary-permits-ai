import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteShell";
import { HOME_FAQ, faqJsonLd } from "../_components/faq";

export const metadata: Metadata = {
  title: "About YYC Permits — Natural-Language Search for Calgary Building Permits",
  description:
    "YYC Permits makes the City of Calgary's 488K+ building permit records searchable in plain English. Built for contractors, realtors, journalists, and curious Calgarians.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className="max-w-3xl mx-auto">
        <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          About · Mission · FAQ
        </div>

        <h1 className="fade-up delay-1 hero-title text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          Calgary&rsquo;s permit data,<br />finally searchable.
        </h1>

        <p className="fade-up delay-2 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 sm:mb-10">
          Every year, the City of Calgary issues tens of thousands of building permits. That
          data is public — but buried in a portal built for spreadsheets, not people. YYC
          Permits turns the whole database into a conversation: type a question, get answers
          on a map.
        </p>

        <div className="fade-up delay-3 glass rounded-2xl p-6 sm:p-8 mb-10 sm:mb-12 space-y-5 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            What we do
          </h2>
          <p>
            We ingest the full City of Calgary permits dataset nightly — every residential
            build, every commercial tenant improvement, every basement development going back
            over a decade. That&rsquo;s <strong>488,000+ permits</strong>, each with the
            address, contractor, applicant, project cost, square footage, permit type, and
            exact coordinates.
          </p>
          <p>
            On top of that, we run a carefully sandboxed AI that translates natural-language
            questions into read-only SQL. You never see the SQL. You just ask
            &ldquo;<em>who built the most houses in Auburn Bay last year?</em>&rdquo; and see
            the answer — tabulated, totalled, and mapped.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {[
            ["Contractors", "Scout competitors, benchmark your project volume, study who's winning in each community.", "/contractors"],
            ["Realtors", "Quantify development activity in any Calgary neighbourhood before listing or buying.", "/communities"],
            ["Journalists", "Follow the money: who's building what, where, and how much it costs.", "/"],
            ["Homeowners", "Verify a contractor's history before hiring. See everything they've built.", "/contractors"],
          ].map(([title, body, href]) => (
            <Link
              key={title}
              href={href}
              className="fade-up delay-3 glass rounded-2xl p-5 sm:p-6 hover:shadow-xl transition group"
            >
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {title} →
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{body}</p>
            </Link>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold tracking-tight mb-2">Frequently asked</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            The short version of everything most people want to know.
          </p>
          <div className="grid gap-3">
            {HOME_FAQ.map((qa) => (
              <details
                key={qa.q}
                className="group glass rounded-2xl p-5 cursor-pointer transition hover:shadow-lg"
              >
                <summary className="flex items-start justify-between gap-4 list-none font-medium">
                  <span className="text-sm sm:text-base">{qa.q}</span>
                  <span className="text-zinc-400 group-open:rotate-45 transition-transform text-xl leading-none shrink-0 mt-0.5">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            Ready to ask?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
            Ten questions free — no signup required for the first few.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition"
          >
            Try a search →
          </Link>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOME_FAQ)) }}
      />
    </PageShell>
  );
}
