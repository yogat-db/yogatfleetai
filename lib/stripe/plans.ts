export type StripePlanId = 'basic' | 'pro';

export type StripePlan = {
  id: StripePlanId;
  name: string;
  price: number;
  interval: 'month';
  featured?: boolean;
  priceId?: string;
  features: string[];
};

export const STRIPE_PLANS: Record<StripePlanId, StripePlan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 18,
    interval: 'month',
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Apply to up to 10 jobs per month',
      'Basic profile listing',
      'Email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    price: 35,
    interval: 'month',
    featured: true,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited job applications',
      'Verified badge',
      'Priority listing in search',
      'Priority support',
    ],
  },
};

export function getStripePlan(planId: string) {
  if (planId !== 'basic' && planId !== 'pro') return null;
  return STRIPE_PLANS[planId];
}

export function getPublicStripePlans() {
  return Object.values(STRIPE_PLANS).map(({ priceId, ...plan }) => plan);
}