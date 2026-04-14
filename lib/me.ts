import { supabaseServer } from '@/lib/supabase/server';
import { limitFor, type Plan } from '@/lib/plan';

export type Me = {
  authenticated: boolean;
  email?: string;
  plan?: Plan;
  used?: number;
  limit?: number;
  subscription_status?: string | null;
  current_period_end?: string | null;
};

export async function getMe(): Promise<Me> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authenticated: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, email, full_name, subscription_status, current_period_end')
    .eq('id', user.id)
    .single();
  const plan: Plan = profile?.plan === 'pro' ? 'pro' : 'free';
  const limit = limitFor(plan);

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('query_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', periodStart.toISOString());

  return {
    authenticated: true,
    email: profile?.email ?? user.email,
    plan,
    used: count ?? 0,
    limit,
    subscription_status: profile?.subscription_status ?? null,
    current_period_end: profile?.current_period_end ?? null,
  };
}
