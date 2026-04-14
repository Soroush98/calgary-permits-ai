import QueryApp from './QueryApp';
import { getMe } from '@/lib/me';
import { SiteHeader, SiteFooter } from './_components/SiteShell';
import { HOME_FAQ, faqJsonLd } from './_components/faq';

export default async function Home() {
  const initialMe = await getMe();
  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-[#050507] text-zinc-900 dark:text-zinc-100">
      <div className="hero-backdrop" />
      <div className="grain" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16">
        <SiteHeader />

        <div className="text-center mb-12">
          <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · 488,000 Calgary permits indexed
          </div>

          <h1 className="fade-up delay-1 hero-title text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Ask anything.<br />See everything built.
          </h1>

          <p className="fade-up delay-2 mt-5 sm:mt-6 text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Natural-language search across every City of Calgary building permit.
            Type a question — get answers, contractors, costs, and a live map.
          </p>
        </div>

        <div className="fade-up delay-3 relative">
          <div className="glass rounded-2xl p-4 sm:p-6">
            <QueryApp initialMe={initialMe} />
          </div>
        </div>

        <div className="fade-up delay-3 mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-4 text-center max-w-2xl mx-auto">
          {[
            ['488K', 'permits'],
            ['1.8K+', 'contractors'],
            ['1000+', 'questions / mo'],
          ].map(([n, l]) => (
            <div key={l} className="px-2 sm:px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] backdrop-blur-sm">
              <div className="text-xl sm:text-3xl font-semibold tracking-tight">{n}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1 truncate">{l}</div>
            </div>
          ))}
        </div>

        <section className="mt-16 sm:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-center mb-2">
            Common questions
          </h2>
          <p className="text-center text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-6 sm:mb-8">
            Everything you can ask about Calgary building permits.
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

        <SiteFooter />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOME_FAQ)) }}
      />
    </main>
  );
}
