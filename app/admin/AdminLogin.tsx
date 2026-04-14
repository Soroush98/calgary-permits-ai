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
    const apiBase = window.location.pathname.replace(/^\/admin/, '/api/admin');
    const res = await fetch(`${apiBase}/login`, {
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
    <form onSubmit={submit} className="max-w-sm mx-auto space-y-4">
      <div className="space-y-3">
        <input
          className="w-full rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-4 py-2.5 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          placeholder="Username"
          autoComplete="username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-4 py-2.5 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-4 py-2.5 text-sm disabled:opacity-50 hover:brightness-110 transition"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && (
        <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </form>
  );
}
