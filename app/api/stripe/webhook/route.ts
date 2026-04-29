import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!sig) throw new Error('Missing stripe-signature header');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const mechanicId = session.metadata?.mechanicId;
        const plan = session.metadata?.plan; // 'basic' or 'pro'
        const customerId = session.customer as string;

        if (!mechanicId) {
          console.error('Webhook: missing mechanicId in metadata');
          break;
        }

        const supabase = await createClient();

        // Update mechanic subscription
        const { error } = await supabase
          .from('mechanics')
          .update({
            subscription_status: 'active',
            plan: plan,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mechanicId);

        if (error) {
          console.error('Webhook failed to update mechanic:', error);
        } else {
          console.log(`Webhook: activated subscription for mechanic ${mechanicId} (${plan})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const supabase = await createClient();
        // Find mechanic by stripe_customer_id and set status to cancelled
        await supabase
          .from('mechanics')
          .update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}