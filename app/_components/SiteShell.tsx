import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-3 mb-8 sm:mb-12 fade-up">
      <Link
        href="/"
        aria-label="YYC Permits home"
        className="inline-flex items-center shrink-0"
      >
        <Image
          src="/logo.svg"
          alt="YYC Permits"
          width={160}
          height={32}
          priority
          className="h-7 sm:h-8 w-auto"
        />
      </Link>
      <nav
        aria-label="Primary"
        className="flex items-center gap-0.5 sm:gap-2 text-[13px] sm:text-sm"
      >
        <NavLink href="/contractors">Contractors</NavLink>
        <NavLink href="/communities">
          <span className="sm:hidden">Areas</span>
          <span className="hidden sm:inline">Communities</span>
        </NavLink>
        <NavLink href="/about">About</NavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2 py-1.5 sm:px-3 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 pt-8 border-t border-zinc-200/60 dark:border-white/10 grid gap-6 sm:grid-cols-3 text-sm text-zinc-600 dark:text-zinc-400">
      <div>
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">YYC Permits</div>
        <p className="mt-2 text-xs leading-relaxed">
          Natural-language search across every City of Calgary building permit. Open data,
          read-only, updated daily.
        </p>
      </div>
      <div>
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Explore</div>
        <ul className="mt-2 space-y-1 text-xs">
          <li><Link href="/contractors" className="hover:underline">Top contractors</Link></li>
          <li><Link href="/communities" className="hover:underline">Calgary communities</Link></li>
          <li><Link href="/about" className="hover:underline">About & FAQ</Link></li>
        </ul>
      </div>
      <div>
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Data</div>
        <p className="mt-2 text-xs leading-relaxed">
          Source: City of Calgary Open Data portal. AI translates natural language to SQL —
          read-only, never modifies anything.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-[#050507] text-zinc-900 dark:text-zinc-100">
      <div className="hero-backdrop" />
      <div className="grain" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </main>
  );
}
