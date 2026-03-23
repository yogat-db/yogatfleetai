import { NextResponse } from 'next/server';

export async function GET() {
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      priceId: process.env.STRIPE_PRICE_BASIC,
      features: [
        'Apply to up to 10 jobs per month',
        'Basic profile listing',
        'Email support',
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 29.99,
      priceId: process.env.STRIPE_PRICE_PRO,
      features: [
        'Unlimited job applications',
        'Verified badge',
        'Priority listing in search',
        'Priority support',
      ],
    },
  ];

  // Validate that price IDs are configured
  const missing = plans.filter(p => !p.priceId);
  if (missing.length) {
    console.error('Missing Stripe price IDs for plans:', missing.map(p => p.id));
    return NextResponse.json(
      { error: 'Server configuration error: missing price IDs' },
      { status: 500 }
    );
  }

  return NextResponse.json(plans);
}