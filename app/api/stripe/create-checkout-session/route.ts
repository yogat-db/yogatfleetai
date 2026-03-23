import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate – await the server client
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the mechanic record to get the Stripe customer ID
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (mechanicError || !mechanic) {
      console.error('Mechanic not found:', mechanicError);
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 });
    }

    const customerId = mechanic.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // 3. Create a Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard`,
    });

    // 4. Return the session URL for frontend redirection
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe portal session error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}