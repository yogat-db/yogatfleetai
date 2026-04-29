import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  try {
    const { token } = await req.json();  // receive one‑time token from frontend
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Missing app URL' }, { status: 500 });
    }

    const priceId = process.env.STRIPE_MULTI_VEHICLE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Missing price ID' }, { status: 500 });
    }

    // Authenticate via token (or fallback to cookie, but token is better)
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();
    if (!user && token) {
      // If cookie fails but we have token, verify it (you need a token verification endpoint/helper)
      const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
      user = tokenUser;
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/vehicles?upgrade=success&token=${token}`, // pass token back
      cancel_url: `${appUrl}/vehicles?upgrade=cancel`,
      metadata: {
        userId: user.id,
        type: 'multi_vehicle_upgrade',
        token: token, // store token to verify on return
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Multi-vehicle checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}