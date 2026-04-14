'use client';

import { useState } from 'react';
import ResultsView, { type QueryResponse } from '../ResultsView';

export default function AdminPanel() {
  const [question, setQuestion] = useState('');
  const [sql, setSql] = useState('');
  const [resp, setResp] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const base = typeof window !== 'undefined' ? window.location.pathname : '';
  const apiBase = base.replace('/admin-', '/api/admin-');

  async function ask() {
    setBusy(true);
    setResp(null);
    const res = await fetch(`${apiBase}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResp({ error: j.error ?? `HTTP ${res.status}` });
      return;
    }
    setSql(j.sql ?? '');
    setResp(j);
  }

  async function runSql() {
    setBusy(true);
    setResp(null);
    const res = await fetch(`${apiBase}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResp({ error: j.error ?? `HTTP ${res.status}` });
      return;
    }
    setResp({ rows: j.rows, total: j.total, truncated: j.truncated });
  }

  async function logout() {
    await fetch(`${apiBase}/logout`, { method: 'POST' });
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Full API access · No quota · Arbitrary read-only SQL
        </p>
        <button
          onClick={logout}
          className="text-sm rounded-lg border border-zinc-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
        >
          Sign out
        </button>
      </div>

      <section className="space-y-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ask (NL → SQL)</label>
        <textarea
          className="w-full h-20 rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-4 py-3 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition resize-none"
          placeholder="e.g. top 10 communities by permit count in 2024"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={ask}
          disabled={busy || !question.trim()}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-5 py-2 text-sm disabled:opacity-50 hover:brightness-110 transition"
        >
          {busy ? 'Working…' : 'Ask'}
        </button>
      </section>

      <section className="space-y-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Raw SQL (SELECT only)</label>
        <textarea
          className="w-full h-32 font-mono text-xs rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-4 py-3 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition resize-none"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT ..."
        />
        <button
          onClick={runSql}
          disabled={busy || !sql.trim()}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-5 py-2 text-sm disabled:opacity-50 hover:brightness-110 transition"
        >
          {busy ? 'Running…' : 'Run SQL'}
        </button>
      </section>

      <ResultsView resp={resp} />
    </div>
  );
}
