import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe/server';

/**
 * DIGITAL TWIN PAYMENT ROUTE
 * Handles the creation of Stripe Checkout sessions for Fleet Brain features.
 */

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Create Mac-Safe Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options })
              );
            } catch { /* SSR Safe */ }
          },
        },
        global: {
          fetch: (url: string | Request | URL, options: RequestInit | undefined) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                // Fix for the MacBook Air "libcurl" build-time feature error
                'Accept-Encoding': 'identity',
              },
            });
          },
        },
      }
    );

    // 2. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Create Stripe Checkout Session
    // Replace 'price_...' with your actual Stripe Price ID from your dashboard
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Fleet Brain: Digital Twin Activation',
              description: 'Unlock AI-driven maintenance predictions for your entire fleet.',
            },
            unit_amount: 2900, // £29.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/dashboard/fleet?success=true`,
      cancel_url: `${request.headers.get('origin')}/dashboard/fleet?canceled=true`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        feature: 'digital_twin_activation'
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('PAYMENT_SESSION_ERROR:', err.message);
    return NextResponse.json(
      { error: 'Could not initialize payment session' },
      { status: 500 }
    );
  }
}