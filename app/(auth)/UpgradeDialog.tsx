'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UpgradeDialog({
  open,
  onClose,
  used,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 backdrop-fade"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden rounded-3xl modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-600 opacity-35 blur-3xl pointer-events-none" />
        <div className="relative glass-solid rounded-3xl p-7 sm:p-8">
          <div className="flex items-start justify-between">
            <h2 className="hero-title text-2xl sm:text-3xl font-semibold tracking-tight">You&apos;ve hit the free limit</h2>
            <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-2xl leading-none w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/5 transition">×</button>
          </div>
          {typeof used === 'number' && typeof limit === 'number' && (
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              You&apos;ve used {used} of {limit} free queries this month.
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider font-medium text-zinc-500">Pro plan</div>
                <div className="mt-1 text-4xl font-semibold tracking-tight">$30<span className="text-base font-normal text-zinc-500">/month</span></div>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 1,000 queries per month</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Priority LLM throughput</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Cancel anytime</li>
            </ul>
            <button
              onClick={upgrade}
              disabled={loading}
              className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-b from-zinc-900 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Redirecting
                </span>
              ) : (
                <>Upgrade to Pro →</>
              )}
            </button>
            {error && <div className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
