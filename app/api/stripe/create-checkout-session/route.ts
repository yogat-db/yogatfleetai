import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  try {
    const { planId, mechanicId, successUrl, cancelUrl } = await req.json();

    // Map plan IDs to your existing environment variable names
    const priceMap: Record<string, string> = {
      basic: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
      pro: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID!,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { mechanicId, planId },
      subscription_data: { metadata: { mechanicId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}