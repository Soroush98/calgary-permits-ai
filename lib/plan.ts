export const FREE_MONTHLY_LIMIT = 10;
export const PRO_MONTHLY_LIMIT = 1000;

export type Plan = 'free' | 'pro';

export function limitFor(plan: Plan): number {
  return plan === 'pro' ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
}
