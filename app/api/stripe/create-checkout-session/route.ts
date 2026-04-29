// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get price ID from environment variables
    let priceId: string | undefined;
    if (planId === 'basic') {
      priceId = process.env.STRIPE_BASIC_PRICE_ID;
    } else if (planId === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID;
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${planId}`);
      return NextResponse.json(
        { error: `Subscription not configured. Please contact support.` },
        { status: 500 }
      );
    }

    // ✅ Authenticate using the same pattern as other protected routes
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no writes needed */ },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error in stripe checkout:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify mechanic belongs to this user
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (mechError || !mechanic) {
      console.error('Mechanic verification error:', mechError?.message);
      return NextResponse.json({ error: 'Invalid mechanic profile' }, { status: 403 });
    }

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
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}