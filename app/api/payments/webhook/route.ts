import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      const { jobId } = paymentIntent.metadata
      // Update job status to 'in_progress' or similar
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
      // Update transaction status
      await supabase.from('transactions').update({ status: 'paid' }).eq('stripe_payment_intent', paymentIntent.id)
      break
    // Handle other events (payment_intent.payment_failed, etc.)
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}