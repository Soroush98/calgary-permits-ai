'use client';

import { useEffect, useState } from 'react';

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">You&apos;ve hit the free limit</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none px-1">×</button>
        </div>
        {typeof used === 'number' && typeof limit === 'number' && (
          <p className="mt-1 text-sm text-zinc-500">
            You&apos;ve used {used} of {limit} free queries this month.
          </p>
        )}

        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-500">Pro plan</div>
              <div className="mt-1 text-3xl font-semibold">$30<span className="text-base font-normal text-zinc-500">/month</span></div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li>✓ 1,000 queries per month</li>
            <li>✓ Priority LLM throughput</li>
            <li>✓ Cancel anytime</li>
          </ul>
          <button
            onClick={upgrade}
            disabled={loading}
            className="mt-5 w-full h-11 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
          {error && <div className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</div>}
        </div>
      </div>
    </div>
  );
}
