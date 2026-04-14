'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`${window.location.pathname}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Login failed');
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <input
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        placeholder="user"
        autoComplete="username"
        value={user}
        onChange={(e) => setUser(e.target.value)}
      />
      <input
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        type="password"
        placeholder="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-2 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
