import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function updateMechanicById(
  mechanicId: string,
  updates: Record<string, string | null>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('mechanics')
    .update(updates)
    .eq('id', mechanicId);

  if (error) {
    console.error('Webhook mechanic update by id failed:', error);
  }
}

async function updateMechanicByCustomerId(
  customerId: string,
  updates: Record<string, string | null>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('mechanics')
    .update(updates)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Webhook mechanic update by customer id failed:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const mechanicId = session.metadata?.mechanic_id ?? null;
  const planId = session.metadata?.plan_id ?? null;
  const customerId = typeof session.customer === 'string' ? session.customer : null;

  if (!mechanicId) {
    console.error('Webhook: missing mechanic_id in checkout.session.completed metadata');
    return;
  }

  await updateMechanicById(mechanicId, {
    subscription_status: 'active',
    plan: planId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : null;

  if (!customerId) {
    console.error('Webhook: missing customer on customer.subscription.updated');
    return;
  }

  const planId = subscription.metadata?.plan_id ?? null;

  await updateMechanicByCustomerId(customerId, {
    subscription_status: subscription.status,
    plan: planId,
    updated_at: new Date().toISOString(),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : null;

  if (!customerId) {
    console.error('Webhook: missing customer on customer.subscription.deleted');
    return;
  }

  await updateMechanicByCustomerId(customerId, {
    subscription_status: 'cancelled',
    updated_at: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Webhook error: missing stripe-signature header');
    return jsonError('Missing stripe-signature header', 400);
  }

  if (!webhookSecret) {
    console.error('Webhook error: missing STRIPE_WEBHOOK_SECRET');
    return jsonError('Webhook is not configured', 500);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown signature verification error';

    console.error('Webhook signature verification failed:', message);
    return jsonError(`Invalid signature: ${message}`, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook processing error for ${event.type}:`, error);
    return jsonError('Webhook handler failed', 500);
  }
}