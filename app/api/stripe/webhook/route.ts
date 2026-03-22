import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/admin'; // you must create this

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle successful subscription purchase
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const mechanicId = session.metadata?.mechanicId;
    if (mechanicId) {
      await supabaseAdmin
        .from('mechanics')
        .update({ subscription_status: 'active' })
        .eq('id', mechanicId);
      console.log(`Activated subscription for mechanic ${mechanicId}`);
    }
  }

  // Handle subscription cancellation (optional)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const mechanicId = subscription.metadata?.mechanicId;
    if (mechanicId) {
      await supabaseAdmin
        .from('mechanics')
        .update({ subscription_status: 'inactive' })
        .eq('id', mechanicId);
      console.log(`Deactivated subscription for mechanic ${mechanicId}`);
    }
  }

  return NextResponse.json({ received: true });
}