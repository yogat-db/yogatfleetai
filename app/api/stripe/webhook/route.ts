import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Create Supabase client (needs cookies, but in webhook we can't use cookies – use service role instead)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // use service role key for admin privileges
    {
      cookies: {
        get() { return '' }, // not needed
        set() {},
        remove() {},
      },
    }
  )

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { jobId, userId, mechanicId } = paymentIntent.metadata

      // Update transaction status to 'held'
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: 'held' })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      if (txError) {
        console.error('Failed to update transaction:', txError)
      }

      // Update job status to 'in_progress'
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId)

      if (jobError) {
        console.error('Failed to update job status:', jobError)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id)
      break
    }

    case 'charge.captured': {
      const charge = event.data.object
      const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
      await supabase
        .from('transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', paymentIntent.id)
      break
    }

    // Add more cases as needed
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}