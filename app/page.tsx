import QueryApp from './QueryApp';
import { getMe } from '@/lib/me';

export default async function Home() {
  const initialMe = await getMe();
  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-[#050507] text-zinc-900 dark:text-zinc-100">
      <div className="hero-backdrop" />
      <div className="grain" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-12">
          <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · 488,000 Calgary permits indexed
          </div>

          <h1 className="fade-up delay-1 hero-title text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Ask anything.<br />See everything built.
          </h1>

          <p className="fade-up delay-2 mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Natural-language search across every City of Calgary building permit.
            Type a question — get answers, contractors, costs, and a live map.
          </p>
        </div>

        <div className="fade-up delay-3 relative">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <QueryApp initialMe={initialMe} />
          </div>
        </div>

        <div className="fade-up delay-3 mt-10 grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
          {[
            ['488K', 'permits'],
            ['1.8K+', 'contractors'],
            ['∞', 'questions'],
          ].map(([n, l]) => (
            <div key={l} className="px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight">{n}</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1">{l}</div>
            </div>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Built in Calgary · Open data from the City of Calgary · AI translates to SQL, read-only
        </footer>
      </div>
    </main>
  );
}
