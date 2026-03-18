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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get mechanic's Stripe customer ID
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!mechanic?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: mechanic.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal session error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}