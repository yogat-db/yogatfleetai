import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { getStripePlan } from '@/lib/stripe/plans';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getSafeRedirectUrl(path: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL');
  }

  const base = new URL(appUrl);
  const url = new URL(path, base);

  if (url.origin !== base.origin) {
    throw new Error('Invalid redirect URL origin');
  }

  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    const { planId, mechanicId } = await req.json();

    if (!planId || !mechanicId) {
      return jsonError('Missing required fields', 400);
    }

    const plan = getStripePlan(String(planId));
    const priceId = plan?.priceId;

    if (!plan || !priceId) {
      return jsonError('Invalid or unconfigured plan', 400);
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonError('Unauthorized', 401);
    }

    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id, user_id, email, stripe_customer_id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (mechanicError) {
      console.error('Mechanic validation error:', mechanicError);
      return jsonError('Failed to validate mechanic profile', 500);
    }

    if (!mechanic) {
      return jsonError('Invalid mechanic profile', 403);
    }

    let customerId = mechanic.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: mechanic.email ?? undefined,
        metadata: {
          user_id: user.id,
          mechanic_id: mechanic.id,
        },
      });

      customerId = customer.id;

      const { error: customerSaveError } = await supabase
        .from('mechanics')
        .update({ stripe_customer_id: customerId })
        .eq('id', mechanic.id)
        .eq('user_id', user.id);

      if (customerSaveError) {
        console.error('Failed to save Stripe customer ID:', customerSaveError);
        return jsonError('Failed to prepare billing profile', 500);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getSafeRedirectUrl('/billing/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: getSafeRedirectUrl('/billing'),
      metadata: {
        user_id: user.id,
        mechanic_id: mechanic.id,
        plan_id: plan.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          mechanic_id: mechanic.id,
          plan_id: plan.id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}