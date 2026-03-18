import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return new NextResponse('Missing signature or webhook secret', { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err)
      return new NextResponse('Invalid signature', { status: 400 })
    }

    // Get supabase admin client (bypass RLS)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // use service role for webhooks
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const { mechanicId, userId, planId } = session.metadata

        // Retrieve subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription)

        // Insert into mechanic_subscriptions
        await supabase.from('mechanic_subscriptions').insert({
          mechanic_id: mechanicId,
          plan_id: planId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })

        // Update mechanic subscription_status to active
        await supabase
          .from('mechanics')
          .update({ subscription_status: 'active' })
          .eq('id', mechanicId)
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const status = subscription.status === 'active' ? 'active' : 'inactive'

        // Update mechanic_subscriptions
        await supabase
          .from('mechanic_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        // Update mechanic status
        const { data: sub } = await supabase
          .from('mechanic_subscriptions')
          .select('mechanic_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
          await supabase
            .from('mechanics')
            .update({ subscription_status: status })
            .eq('id', sub.mechanic_id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}