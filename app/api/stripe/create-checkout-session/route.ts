// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, mechanicId, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!planId || !mechanicId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields (planId, mechanicId, successUrl, cancelUrl)' },
        { status: 400 }
      );
    }

    // Get the correct price ID based on plan
    let priceId: string | undefined;
    if (planId === 'basic') {
      priceId = process.env.STRIPE_BASIC_PRICE_ID;
    } else if (planId === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID;
    } else {
      return NextResponse.json({ error: 'Invalid plan. Use "basic" or "pro".' }, { status: 400 });
    }

    // If price ID is missing, return a clear error
    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${planId}`);
      return NextResponse.json(
        { error: `Server configuration error: missing price ID for ${planId}. Please contact support.` },
        { status: 500 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the mechanic belongs to this user
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .single();
    if (mechError || !mechanic) {
      return NextResponse.json({ error: 'Invalid mechanic profile' }, { status: 403 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user.id, mechanicId, plan: planId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    // Always return a valid JSON error
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}