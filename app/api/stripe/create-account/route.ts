import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if mechanic exists
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (mechError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 404 })
    }

    // If mechanic already has a Stripe account, just return the account link
    if (mechanic.stripe_account_id) {
      const accountLink = await stripe.accountLinks.create({
        account: mechanic.stripe_account_id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?onboarding=complete`,
        type: 'account_onboarding',
      })
      return NextResponse.json({ url: accountLink.url })
    }

    // Create new Stripe Connect account (Express)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB', // change as needed
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
    })

    // Save account ID to database
    await supabase
      .from('mechanics')
      .update({ stripe_account_id: account.id })
      .eq('id', mechanic.id)

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}