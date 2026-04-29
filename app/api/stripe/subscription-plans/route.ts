// app/api/stripe/subscription-plans/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const plans = [
      {
        id: 'basic',
        name: 'Basic',
        price: 18.00,
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
        features: [
          'Apply to up to 10 jobs per month',
          'Basic profile listing',
          'Email support',
        ],
      },
      {
        id: 'pro',
        name: 'Professional',
        price: 35.00,
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        features: [
          'Unlimited job applications',
          'Verified badge',
          'Priority listing in search',
          'Priority support',
        ],
      },
    ];

    const missing = plans.filter(p => !p.priceId);
    if (missing.length) {
      console.error('Missing Stripe price IDs for:', missing.map(p => p.id));
      return NextResponse.json(
        { error: 'Subscription plans not configured. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(plans);
  } catch (err) {
    console.error('Failed to fetch subscription plans:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}