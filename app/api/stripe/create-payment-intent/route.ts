import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { jobId, amount } = body // amount in smallest currency unit (e.g., pence)

    if (!jobId || !amount) {
      return NextResponse.json({ error: 'Missing jobId or amount' }, { status: 400 })
    }

    // Verify job exists and is owned by the current user
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your job' }, { status: 403 })
    }
    if (job.status !== 'assigned') {
      return NextResponse.json({ error: 'Job not in assignable state' }, { status: 400 })
    }

    // Get accepted application to know the mechanic
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('mechanic_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'No accepted application found' }, { status: 400 })
    }

    // Get mechanic's Stripe account ID
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('stripe_account_id')
      .eq('id', application.mechanic_id)
      .single()

    if (mechError || !mechanic?.stripe_account_id) {
      return NextResponse.json({ error: 'Mechanic not ready to receive payments' }, { status: 400 })
    }

    // Calculate platform fee (e.g., 15%)
    const platformFee = Math.round(amount * 0.15)

    // Create PaymentIntent with manual capture (escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      capture_method: 'manual',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: mechanic.stripe_account_id,
      },
      metadata: {
        jobId,
        userId: user.id,
        mechanicId: application.mechanic_id,
      },
    })

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        job_id: jobId,
        user_id: user.id,
        mechanic_id: application.mechanic_id,
        amount,
        platform_fee: platformFee,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      }])

    if (txError) {
      console.error('Failed to save transaction:', txError)
      // Rollback: cancel the PaymentIntent
      await stripe.paymentIntents.cancel(paymentIntent.id)
      return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 })
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}