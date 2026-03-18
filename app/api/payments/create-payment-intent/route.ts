import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {}, // Not used in API routes
          remove() {}, // Not used in API routes
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { jobId, mechanicId, amount } = body

    if (!jobId || !mechanicId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure amount is a positive integer (pence)
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get mechanic's Stripe account ID
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('stripe_account_id')
      .eq('id', mechanicId)
      .single()

    if (mechanicError || !mechanic?.stripe_account_id) {
      return NextResponse.json({ error: 'Mechanic not ready to receive payments' }, { status: 400 })
    }

    // Create PaymentIntent with funds held in platform account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount is already in pence
      currency: 'gbp',
      payment_method_types: ['card'],
      transfer_data: {
        destination: mechanic.stripe_account_id,
      },
      application_fee_amount: Math.round(amount * 0.1), // 10% platform fee (also in pence)
      metadata: { jobId, userId: user.id },
    })

    // Store transaction record (optional but recommended for tracking)
    await supabase.from('transactions').insert({
      job_id: jobId,
      user_id: user.id,
      mechanic_id: mechanicId,
      amount: amount / 100, // store in pounds for readability
      stripe_payment_intent: paymentIntent.id,
      status: 'pending',
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('Payment intent creation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}