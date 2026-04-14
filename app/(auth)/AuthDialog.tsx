'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Mode = 'signup' | 'login';

export default function AuthDialog({
  open,
  onClose,
  initialMode = 'signup',
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = supabaseBrowser();

  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
        setInfo('Check your inbox to confirm your email, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
  const sub = mode === 'signup' ? 'Free plan includes 10 queries per month.' : 'Sign in to keep querying.';
  const cta = mode === 'signup' ? 'Create account' : 'Sign in';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 backdrop-fade"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mesh-gradient accent blobs clipped inside the card */}
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-600 opacity-35 blur-3xl pointer-events-none" />

        <div className="relative glass-solid rounded-3xl p-7 sm:p-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="hero-title text-2xl sm:text-3xl font-semibold tracking-tight">{heading}</h2>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{sub}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-2xl leading-none w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/5 transition"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 w-full h-12 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm font-medium flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-zinc-400">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-white/10" />
            or email
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-white/10" />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <div className="relative group">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="relative w-full h-12 px-4 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:border-transparent transition"
              />
            </div>
            <div className="relative group">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
              <input
                type="password"
                required
                placeholder={mode === 'signup' ? 'Password (min 8 chars)' : 'Password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="relative w-full h-12 px-4 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 px-1 animate-in fade-in">{error}</div>
            )}
            {info && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 px-1 animate-in fade-in">{info}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-12 rounded-2xl bg-gradient-to-b from-zinc-900 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Just a moment
                </span>
              ) : (
                <>{cta} →</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setInfo(null); }}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            >
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2">
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
