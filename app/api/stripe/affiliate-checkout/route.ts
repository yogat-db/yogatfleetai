import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    if (!items || !items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Authenticate user (optional – allow guest checkout)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Build line items for Stripe Checkout
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            affiliate_product_id: item.id,
            platform: item.platform,
            external_id: item.external_id,
          },
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses pence
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/affiliate/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/affiliate/cart`,
      metadata: {
        userId: userId || 'guest',
        cart_items: JSON.stringify(items.map((i: any) => ({ id: i.id, qty: i.quantity }))),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Affiliate checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}