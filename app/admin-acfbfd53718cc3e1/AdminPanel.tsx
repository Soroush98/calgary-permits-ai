'use client';

import { useState } from 'react';

type Row = Record<string, unknown>;

export default function AdminPanel() {
  const [question, setQuestion] = useState('');
  const [sql, setSql] = useState('');
  const [explanation, setExplanation] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = typeof window !== 'undefined' ? window.location.pathname : '';
  const apiBase = base.replace('/admin-', '/api/admin-');

  async function ask() {
    setBusy(true);
    setError(null);
    setRows([]);
    setSql('');
    setExplanation('');
    const res = await fetch(`${apiBase}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? `HTTP ${res.status}`);
      return;
    }
    if (j.sql) setSql(j.sql);
    if (j.explanation) setExplanation(j.explanation);
    if (j.error) setError(j.error);
    if (Array.isArray(j.rows)) setRows(j.rows);
  }

  async function runSql() {
    setBusy(true);
    setError(null);
    setRows([]);
    const res = await fetch(`${apiBase}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? `HTTP ${res.status}`);
      return;
    }
    if (j.error) setError(j.error);
    if (Array.isArray(j.rows)) setRows(j.rows);
  }

  async function logout() {
    await fetch(`${apiBase}/logout`, { method: 'POST' });
    window.location.reload();
  }

  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Full API access. No quota, no user binding. Arbitrary read-only SQL allowed.
        </p>
        <button
          onClick={logout}
          className="text-sm rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1"
        >
          Sign out
        </button>
      </div>

      <section className="space-y-2">
        <label className="text-sm font-medium">Ask (NL → SQL)</label>
        <textarea
          className="w-full h-20 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          placeholder="e.g. top 10 communities by permit count in 2024"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={ask}
          disabled={busy || !question.trim()}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-2 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Ask'}
        </button>
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium">Raw SQL (SELECT only)</label>
        <textarea
          className="w-full h-32 font-mono text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT ..."
        />
        <button
          onClick={runSql}
          disabled={busy || !sql.trim()}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-2 disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run SQL'}
        </button>
      </section>

      {explanation && <p className="text-sm text-zinc-500">{explanation}</p>}
      {error && (
        <pre className="text-sm text-red-600 whitespace-pre-wrap bg-red-50 dark:bg-red-950/30 rounded p-3">
          {error}
        </pre>
      )}

      {rows.length > 0 && (
        <div className="overflow-auto border border-zinc-200 dark:border-zinc-800 rounded">
          <table className="text-xs w-full">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="text-left px-2 py-1 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-1 align-top">
                      {typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
