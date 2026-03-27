import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a one‑time checkout session for the upgrade product
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_MULTI_VEHICLE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vehicles?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/vehicles?upgrade=cancel`,
      metadata: {
        userId: user.id,
        type: 'multi_vehicle_upgrade',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Create multi‑vehicle checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}