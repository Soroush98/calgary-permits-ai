import { isAdmin } from '@/lib/admin';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authed = await isAdmin();
  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-[#050507] text-zinc-900 dark:text-zinc-100">
      <div className="hero-backdrop" />
      <div className="grain" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 backdrop-blur mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Superadmin
          </div>
          <h1 className="hero-title text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            {authed ? 'Command Center' : 'Admin Access'}
          </h1>
          {!authed && (
            <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
              Sign in to access the admin panel.
            </p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          {authed ? <AdminPanel /> : <AdminLogin />}
        </div>
      </div>
    </main>
  );
}
