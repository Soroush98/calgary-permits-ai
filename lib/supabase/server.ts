import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            for (const { name, value, options } of items) store.set(name, value, options);
          } catch {
            // Called from a Server Component where cookies can't be set. Middleware refreshes instead.
          }
        },
      },
    },
  );
}
