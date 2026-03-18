import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

// Webhook secret from Stripe dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return new NextResponse('Missing stripe-signature header', { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Helper to get Supabase client (server‑side)
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = await getSupabase()
  const { customer, subscription, client_reference_id } = session

  if (!customer || !subscription) return

  const customerId = typeof customer === 'string' ? customer : customer.id
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id

  // Update the mechanic's record with Stripe IDs and set subscription status to active
  const { error } = await supabase
    .from('mechanics')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('user_id', client_reference_id) // client_reference_id should be the user ID

  if (error) console.error('Error updating mechanic after checkout:', error)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = await getSupabase()
  const subscriptionId = invoice.subscription
  if (!subscriptionId) return

  // Optionally update last payment date or keep subscription active
  // (subscription is already active)
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const supabase = await getSupabase()
  const status = subscription.status === 'active' ? 'active' : 'inactive'

  const { error } = await supabase
    .from('mechanics')
    .update({ subscription_status: status })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error updating subscription status:', error)
}