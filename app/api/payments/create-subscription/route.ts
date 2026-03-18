import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId } = await req.json()

    // Check if mechanic profile exists
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (mechError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let customerId = mechanic.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { mechanicId: mechanic.id },
      })
      customerId = customer.id
      await supabase
        .from('mechanics')
        .update({ stripe_customer_id: customerId })
        .eq('id', mechanic.id)
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/subscribe?canceled=true`,
      metadata: {
        mechanicId: mechanic.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Create subscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}