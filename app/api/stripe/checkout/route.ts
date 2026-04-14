import { supabaseServer } from '@/lib/supabase/server';
import { stripe, PRO_PRICE_ID } from '@/lib/stripe';

export async function POST() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PRO_PRICE_ID(), quantity: 1 }],
    success_url: `${origin}/?upgraded=1`,
    cancel_url: `${origin}/?canceled=1`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
