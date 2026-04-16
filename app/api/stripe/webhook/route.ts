import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'webhook not configured' }, { status: 500 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return Response.json({ error: 'missing signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `invalid signature: ${msg}` }, { status: 400 });
  }

  const db = supabaseAdmin();

  async function applySubscription(sub: Stripe.Subscription) {
    const userId = (sub.metadata?.user_id as string | undefined) ?? null;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const active = sub.status === 'active' || sub.status === 'trialing';
    const plan = active ? 'pro' : 'free';
    const periodEnd = sub.items.data[0]?.current_period_end ?? null;

    const patch = {
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    };

    if (userId) {
      await db.from('profiles').update(patch).eq('id', userId);
    } else {
      await db.from('profiles').update(patch).eq('stripe_customer_id', customerId);
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripe().subscriptions.retrieve(subId);
        if (!sub.metadata?.user_id && session.client_reference_id) {
          sub.metadata = { ...sub.metadata, user_id: session.client_reference_id };
        }
        await applySubscription(sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }
  }

  return Response.json({ received: true });
}
