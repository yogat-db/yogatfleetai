import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

type CartItemInput = {
  id: string;
  quantity: number;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function normalizeQuantity(value: unknown) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1) return 1;
  return Math.min(qty, 25);
}

function toStripeAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid product price');
  }
  return Math.round(amount * 100);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return jsonError('Cart is empty', 400);
    }

    const parsedItems: CartItemInput[] = items
      .map((item: any) => ({
        id: String(item?.id ?? ''),
        quantity: normalizeQuantity(item?.quantity),
      }))
      .filter((item: { id: any; }) => item.id);

    if (parsedItems.length === 0) {
      return jsonError('No valid cart items provided', 400);
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth lookup error:', authError);
    }

    const productIds = [...new Set(parsedItems.map((item) => item.id))];

    const { data: products, error: productsError } = await supabase
      .from('affiliate_products')
      .select('id, name, image_url, price, platform, external_id, active')
      .in('id', productIds);

    if (productsError) {
      console.error('Product lookup error:', productsError);
      return jsonError('Failed to load cart products', 500);
    }

    if (!products || products.length === 0) {
      return jsonError('No matching products found', 404);
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const checkoutItems: Array<{ id: string; quantity: number }> = [];

    for (const item of parsedItems) {
      const product = productMap.get(item.id);

      if (!product || product.active === false) {
        continue;
      }

      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: toStripeAmount(product.price),
          product_data: {
            name: product.name,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: {
              affiliate_product_id: String(product.id),
              platform: String(product.platform ?? ''),
              external_id: String(product.external_id ?? ''),
            },
          },
        },
      });

      checkoutItems.push({
        id: String(product.id),
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      return jsonError('No valid purchasable items found', 400);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return jsonError('App URL is not configured', 500);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/affiliate/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/affiliate/cart`,
      metadata: {
        user_id: user?.id ?? 'guest',
        item_count: String(checkoutItems.length),
      },
      payment_intent_data: {
        metadata: {
          user_id: user?.id ?? 'guest',
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Affiliate checkout error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}