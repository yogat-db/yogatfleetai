import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * COMPLETION & PAYMENT CAPTURE ROUTE
 * Triggers when the owner confirms the job is done.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const cookieStore = await cookies();

    // 1. Create Mac-Safe Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options })
              );
            } catch { /* SSR Safe */ }
          },
        },
        global: {
          fetch: (url: string | URL | Request, options: RequestInit | undefined) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                'Accept-Encoding': 'identity', // Prevents libcurl build-time errors on Mac
              },
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Verify job ownership and payment state
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('user_id, payment_intent_id, payment_status, assigned_mechanic_id, title')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    
    // Check if there is actually a payment intent to capture
    if (!job.payment_intent_id) {
      return NextResponse.json({ error: 'No payment record found for this job' }, { status: 400 });
    }
    
    if (job.payment_status === 'captured') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
    }

    // 3. Capture the Stripe Payment
    try {
      await stripe.paymentIntents.capture(job.payment_intent_id);
    } catch (stripeErr: any) {
      console.error('Stripe Capture Error:', stripeErr.message);
      return NextResponse.json({ error: 'Payment capture failed' }, { status: 500 });
    }

    // 4. Update job and payment status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        payment_status: 'captured', 
        status: 'completed',
        completed_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('DB Update Error after capture:', updateError.message);
      // Note: Payment is captured, but DB update failed. This needs manual sync or a webhook.
    }

    // 5. Notify the Mechanic (Safe against schema errors)
    if (job.assigned_mechanic_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: job.assigned_mechanic_id,
          type: 'payment_received',
          title: 'Job Completed & Paid!',
          body: `Payment for "${job.title}" has been released.`,
          metadata: { job_id: jobId }
        });
      } catch (notifErr) {
        console.warn('Completion successful, but notification failed:', notifErr);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('CRITICAL_COMPLETION_ERROR:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}