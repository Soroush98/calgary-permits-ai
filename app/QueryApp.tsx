'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PermitMap, { type Anchor, type PermitFeature } from './PermitMap';
import AuthDialog from './(auth)/AuthDialog';
import UpgradeDialog from './(auth)/UpgradeDialog';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Me } from '@/lib/me';

const ANCHOR_COLS = new Set(['anchor_latitude', 'anchor_longitude', 'search_radius_m']);

type Row = Record<string, unknown>;
type Response = { sql?: string; explanation?: string; rows?: Row[]; error?: string; total?: number; truncated?: boolean };

const EXAMPLES = [
  'Multi-family residential permits in Beltline issued since January over $5 million',
  'Top 10 contractors by permit count in the last 12 months',
  'Demolition permits within 1 km of downtown in the last 90 days',
  'Average project cost by community for new residential construction',
];

export default function QueryApp({ initialMe }: { initialMe: Me }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<Response | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [me, setMe] = useState<Me>(initialMe);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function run(question: string) {
    if (!question.trim() || loading) return;
    if (!me?.authenticated) {
      setPending(question);
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (r.status === 401) {
        setPending(question);
        setAuthOpen(true);
        return;
      }
      const data = await r.json();
      if (r.status === 402) {
        setMe((prev) => prev ? { ...prev, used: data.used, limit: data.limit, plan: data.plan } : prev);
        setUpgradeOpen(true);
        return;
      }
      setResp(data);
      if (typeof data.used === 'number') {
        setMe((prev) => prev ? { ...prev, used: data.used, limit: data.limit, plan: data.plan } : prev);
      }
    } catch (e) {
      setResp({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    setMe({ authenticated: false });
    setResp(null);
  }

  const rows = resp?.rows ?? [];
  const allCols = rows.length ? Object.keys(rows[0]) : [];
  const cols = allCols.filter((c) => !ANCHOR_COLS.has(c));
  const mapRows: PermitFeature[] = rows
    .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r) => ({ ...r, latitude: Number(r.latitude), longitude: Number(r.longitude) }));

  const anchor: Anchor | null = useMemo(() => {
    if (!rows.length) return null;
    const r0 = rows[0];
    const lat = Number(r0.anchor_latitude);
    const lng = Number(r0.anchor_longitude);
    const rad = Number(r0.search_radius_m);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng, radiusM: Number.isFinite(rad) ? rad : 0 };
  }, [rows]);

  useEffect(() => { setSelected(null); }, [resp]);

  const goToRow = (pn: string) => {
    setSelected(pn);
    const el = rowRefs.current[pn];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        {me?.authenticated ? (
          <>
            <span className="hidden sm:inline">{me.email}</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 capitalize">{me.plan}</span>
            {typeof me.used === 'number' && typeof me.limit === 'number' && (
              <span className="tabular-nums">{me.used}/{me.limit}</span>
            )}
            {me.plan !== 'pro' && (
              <button onClick={() => setUpgradeOpen(true)} className="text-blue-600 hover:underline">Upgrade</button>
            )}
            <button onClick={signOut} className="hover:text-zinc-900 dark:hover:text-zinc-100">Sign out</button>
          </>
        ) : (
          <button onClick={() => setAuthOpen(true)} className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Sign in
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); run(q); }}
        className="relative group"
      >
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/60 via-purple-500/60 to-pink-500/60 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
        <div className="relative flex items-center gap-2 rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 focus-within:border-transparent shadow-sm p-1.5">
          <input
            className="flex-1 px-4 py-3 bg-transparent text-base sm:text-lg focus:outline-none placeholder:text-zinc-400"
            placeholder="Ask anything about Calgary permits…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />
          <button
            className="px-5 py-3 rounded-xl bg-gradient-to-b from-zinc-900 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-medium text-sm disabled:opacity-40 transition-transform active:scale-95 shadow-md"
            disabled={loading || !q.trim()}
            type="submit"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Thinking
              </span>
            ) : (
              <>Ask →</>
            )}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 text-xs justify-center">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setQ(ex); run(ex); }}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/60 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.08] hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400 transition-all backdrop-blur-sm"
          >
            {ex}
          </button>
        ))}
      </div>

      {resp?.explanation && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400 italic">{resp.explanation}</div>
      )}

      {resp?.sql && (
        <details className="bg-zinc-100 dark:bg-zinc-900 rounded-md p-3 text-xs">
          <summary className="cursor-pointer text-zinc-500">Generated SQL</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono">{resp.sql}</pre>
        </details>
      )}

      {resp?.error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-mono">
          {resp.error}
        </div>
      )}

      {mapRows.length > 0 && (
        <div className="rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-700">
          <PermitMap rows={mapRows} anchor={anchor} selectedPermitnum={selected} onSelect={setSelected} onGoToRow={goToRow} />
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-auto border border-zinc-300 dark:border-zinc-700 rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="text-left px-3 py-2 font-semibold border-b border-zinc-300 dark:border-zinc-700">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pn = typeof r.permitnum === 'string' ? r.permitnum : null;
                const isSelected = pn !== null && pn === selected;
                return (
                  <tr
                    key={pn ?? i}
                    ref={(el) => { if (pn) rowRefs.current[pn] = el; }}
                    onMouseEnter={() => pn && setSelected(pn)}
                    onClick={() => pn && setSelected(pn)}
                    className={`border-b border-zinc-200 dark:border-zinc-800 cursor-pointer ${isSelected ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                  >
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2 font-mono whitespace-nowrap">
                        {formatCell(r[c])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900">
            {resp?.truncated
              ? <>Showing {rows.length.toLocaleString()} of {(resp.total ?? 0).toLocaleString()} rows <span className="text-amber-600 dark:text-amber-400">— refine your query for the full set</span></>
              : <>{(resp?.total ?? rows.length).toLocaleString()} row{(resp?.total ?? rows.length) === 1 ? '' : 's'}</>
            }
          </div>
        </div>
      )}

      {resp && !resp.error && rows.length === 0 && (
        <div className="text-sm text-zinc-500">No rows returned.</div>
      )}

      <AuthDialog
        open={authOpen}
        onClose={async () => {
          setAuthOpen(false);
          const r = await fetch('/api/me', { cache: 'no-store' });
          const next: Me = await r.json();
          setMe(next);
          if (next.authenticated && pending) {
            const q = pending;
            setPending(null);
            setTimeout(() => run(q), 0);
          } else {
            setPending(null);
          }
        }}
      />

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        used={me?.used}
        limit={me?.limit}
      />
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    return v;
  }
  return JSON.stringify(v);
}
