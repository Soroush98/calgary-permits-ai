import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key);
  return cached;
}

export const PRO_PRICE_ID = () => {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id) throw new Error('STRIPE_PRO_PRICE_ID is not set');
  return id;
};
