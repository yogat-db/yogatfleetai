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

    if (!planId || !mechanicId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Authenticate – try Authorization header first, then fallback to cookie
    const authHeader = req.headers.get('authorization');
    let supabase = await createClient();
    let { data: { user }, error: userError } = await supabase.auth.getUser();

    // If cookie auth fails but we have a bearer token, try that
    if ((userError || !user) && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      supabase = await createClient();
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
      if (!tokenError && tokenUser) {
        user = tokenUser;
        userError = null;
      }
    }

    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized – please log in again' }, { status: 401 });
    }

    // 2. Verify mechanic belongs to this user
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (mechError || !mechanic) {
      console.error('Mechanic validation error:', mechError);
      return NextResponse.json({ error: 'Invalid mechanic profile' }, { status: 403 });
    }

    // 3. Map plan to price ID
    let priceId: string | undefined;
    if (planId === 'basic') priceId = process.env.STRIPE_BASIC_PRICE_ID;
    else if (planId === 'pro') priceId = process.env.STRIPE_PRO_PRICE_ID;
    else return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${planId}`);
      return NextResponse.json(
        { error: 'Subscription not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // 4. Create Stripe checkout session
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
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}