import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    if (!sig) throw new Error('Missing stripe-signature header');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const mechanicId = session.metadata?.mechanicId;
        const planId = session.metadata?.planId;

        if (!mechanicId) {
          console.warn('Webhook: checkout.session.completed missing mechanicId');
          break;
        }

        // Update mechanic subscription status
        const { error: updateError } = await supabaseAdmin
          .from('mechanics')
          .update({ subscription_status: 'active' })
          .eq('id', mechanicId);

        if (updateError) {
          console.error('Failed to update mechanic subscription:', updateError);
          // Return 500 to let Stripe retry
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 }
          );
        }

        console.log(`Mechanic ${mechanicId} subscription activated (plan: ${planId})`);
        break;
      }

      // Optional: handle subscription cancellation or updates
      // case 'customer.subscription.deleted': { ... }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    // Return 500 to indicate failure (Stripe will retry)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}