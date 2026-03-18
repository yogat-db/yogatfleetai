import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic profile
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (mechError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 404 })
    }

    const { planId } = await req.json()

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Ensure plan has a Stripe Price ID (if not, create one – simplified here)
    let priceId = plan.stripe_price_id
    if (!priceId) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || undefined,
      })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: plan.currency,
        recurring: { interval: plan.interval },
      })
      priceId = price.id
      // Update plan with Stripe price ID (optional, could be done via seed)
      await supabase
        .from('subscription_plans')
        .update({ stripe_price_id: priceId })
        .eq('id', plan.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/subscribe`,
      customer_email: user.email,
      metadata: {
        mechanicId: mechanic.id,
        userId: user.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          mechanicId: mechanic.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}