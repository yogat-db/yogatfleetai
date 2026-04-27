// app/api/stripe/subscription-plans/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const plans = [
      {
        id: 'basic',
        name: 'Basic',
        price: 18.00,                     // Updated to £18
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
        price: 35.00,                     // Updated to £35
        priceId: process.env.STRIPE_PRICE_PRO,
        features: [
          'Unlimited job applications',
          'Verified badge',
          'Priority listing in search',
          'Priority support',
        ],
      },
    ];

    // Validate that all price IDs are configured
    const missing = plans.filter(p => !p.priceId);
    if (missing.length) {
      console.error('Missing Stripe price IDs for plans:', missing.map(p => p.id));
      return NextResponse.json(
        { error: 'Server configuration error: missing price IDs for ' + missing.map(p => p.id).join(', ') },
        { status: 500 }
      );
    }

    return NextResponse.json(plans);
  } catch (err: any) {
    console.error('Failed to fetch subscription plans:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}