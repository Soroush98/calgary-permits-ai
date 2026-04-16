'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Mode = 'signup' | 'login';

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = supabaseBrowser();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
        });
        if (error) throw error;
        setInfo('Check your inbox to confirm your email. You can log in once confirmed.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const heading = mode === 'signup' ? 'Create your account' : 'Welcome back';
  const sub = mode === 'signup' ? 'Free plan includes 10 queries a day.' : 'Sign in to keep searching.';
  const cta = mode === 'signup' ? 'Create account' : 'Sign in';
  const otherHref = mode === 'signup' ? '/login' : '/signup';
  const otherLabel = mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up";

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{heading}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{sub}</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="mt-6 w-full h-11 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          or use email
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 px-4 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
          <input
            type="password"
            required
            placeholder={mode === 'signup' ? 'Password (min 8 chars)' : 'Password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11 px-4 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />

          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
          {info && <div className="text-xs text-emerald-600 dark:text-emerald-400">{info}</div>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50"
          >
            {loading ? '…' : cta}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-zinc-500">
          <Link href={otherHref} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            {otherLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
