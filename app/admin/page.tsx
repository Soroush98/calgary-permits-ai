import { isAdmin } from '@/lib/admin';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authed = await isAdmin();
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-6">Superadmin</h1>
        {authed ? <AdminPanel /> : <AdminLogin />}
      </div>
    </main>
  );
}
