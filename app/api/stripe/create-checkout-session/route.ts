import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { planId, mechanicId } = await request.json();

    if (!planId || !mechanicId) {
      return NextResponse.json(
        { success: false, error: 'Missing planId or mechanicId' },
        { status: 400 }
      );
    }

    const priceId =
      planId === 'basic'
        ? process.env.STRIPE_BASIC_PRICE_ID
        : planId === 'pro'
          ? process.env.STRIPE_PRO_PRICE_ID
          : null;

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan or missing Stripe price ID' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/marketplace/mechanics/dashboard?checkout=success`,
      cancel_url: `${appUrl}/marketplace/mechanics/subscribe?checkout=cancelled`,
      metadata: {
        mechanicId,
        planId,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('CREATE_CHECKOUT_SESSION_ERROR', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}