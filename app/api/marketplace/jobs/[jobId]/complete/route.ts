import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
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

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, status')
      .eq('id', params.jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your job' }, { status: 403 })
    }

    // Get transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('stripe_payment_intent_id')
      .eq('job_id', params.jobId)
      .eq('status', 'held')
      .single()

    if (txError || !tx) {
      return NextResponse.json({ error: 'No held transaction found' }, { status: 400 })
    }

    // Capture the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.capture(tx.stripe_payment_intent_id)

    // Update job status
    await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', params.jobId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}