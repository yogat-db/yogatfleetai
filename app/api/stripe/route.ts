// app/api/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // 1. Get app base URL (check both possible env var names)
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('Missing NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: missing app URL' },
        { status: 500 }
      );
    }

    // 2. Get multi‑vehicle price ID
    const priceId = process.env.STRIPE_MULTI_VEHICLE_PRICE_ID;
    if (!priceId) {
      console.error('Missing STRIPE_MULTI_VEHICLE_PRICE_ID environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: missing price ID' },
        { status: 500 }
      );
    }

    // 3. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. Create Stripe checkout session (one‑time payment)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/vehicles?upgrade=success`,
      cancel_url: `${appUrl}/vehicles?upgrade=cancel`,
      metadata: {
        userId: user.id,
        type: 'multi_vehicle_upgrade',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Multi-vehicle checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}