'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PermitMap, { type Anchor, type PermitFeature } from './PermitMap';

const ANCHOR_COLS = new Set(['anchor_latitude', 'anchor_longitude', 'search_radius_m']);

type Row = Record<string, unknown>;

export type QueryResponse = {
  sql?: string;
  explanation?: string;
  rows?: Row[];
  error?: string;
  total?: number;
  truncated?: boolean;
};

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    return v;
  }
  return JSON.stringify(v);
}

export default function ResultsView({ resp }: { resp: QueryResponse | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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

  if (!resp) return null;

  return (
    <>
      {resp.explanation && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400 italic">{resp.explanation}</div>
      )}

      {resp.sql && (
        <details className="bg-zinc-100 dark:bg-zinc-900 rounded-md p-3 text-xs">
          <summary className="cursor-pointer text-zinc-500">Generated SQL</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono">{resp.sql}</pre>
        </details>
      )}

      {resp.error && (
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
            {resp.truncated
              ? <>Showing {rows.length.toLocaleString()} of {(resp.total ?? 0).toLocaleString()} rows <span className="text-amber-600 dark:text-amber-400">— refine your query for the full set</span></>
              : <>{(resp.total ?? rows.length).toLocaleString()} row{(resp.total ?? rows.length) === 1 ? '' : 's'}</>
            }
          </div>
        </div>
      )}

      {!resp.error && rows.length === 0 && (
        <div className="text-sm text-zinc-500">No rows returned.</div>
      )}
    </>
  );
}
