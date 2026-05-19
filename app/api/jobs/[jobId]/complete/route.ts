import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extra ?? {}),
    },
    { status }
  );
}

/**
 * COMPLETION & PAYMENT CAPTURE ROUTE
 * Triggered when the job owner confirms the work is complete.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { jobId } = await params;

    if (!jobId?.trim()) {
      return jsonError('Missing job ID', 400);
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Safe in server contexts where cookie writes are not allowed
            }
          },
        },
        global: {
          fetch: (url: string | Request | URL, options: RequestInit | undefined) =>
            fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                'Accept-Encoding': 'identity',
              },
            }),
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[POST /api/jobs/:jobId/complete] auth error:', authError);
      return jsonError('Unauthorized', 401);
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, user_id, payment_intent_id, payment_status, title, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr) {
      console.error('[POST /api/jobs/:jobId/complete] job fetch error:', jobErr);
      return jsonError('Failed to load job', 500, {
        code: jobErr.code,
        details: jobErr.details,
        hint: jobErr.hint,
      });
    }

    if (!job) {
      return jsonError('Job not found', 404);
    }

    if (job.user_id !== user.id) {
      return jsonError('Not authorized', 403);
    }

    if (!job.payment_intent_id) {
      return jsonError('No payment record found for this job', 400);
    }

    if (job.payment_status === 'captured') {
      return jsonError('Payment already processed', 400);
    }

    if (job.status === 'completed') {
      return jsonError('Job already marked as completed', 400);
    }

    try {
      await stripe.paymentIntents.capture(job.payment_intent_id, {}, {
        idempotencyKey: `capture-job-${jobId}`,
      });
    } catch (stripeErr) {
      console.error('[POST /api/jobs/:jobId/complete] Stripe capture error:', stripeErr);
      return jsonError('Payment capture failed', 500);
    }

    const completedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        payment_status: 'captured',
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('[POST /api/jobs/:jobId/complete] DB update error after capture:', updateError);
      return jsonError(
        'Payment captured, but job status update failed. Manual reconciliation required.',
        500,
        {
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        }
      );
    }

    // Find accepted application instead of using removed/missing assigned_mechanic_id
    const { data: acceptedApplication, error: applicationError } = await supabase
      .from('applications')
      .select('mechanic_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (applicationError) {
      console.warn(
        '[POST /api/jobs/:jobId/complete] accepted application lookup failed:',
        applicationError
      );
    }

    if (acceptedApplication?.mechanic_id) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: acceptedApplication.mechanic_id,
          type: 'payment_received',
          title: 'Job Completed & Paid!',
          body: `Payment for "${job.title}" has been released.`,
          metadata: { job_id: jobId },
        });

      if (notificationError) {
        console.warn(
          '[POST /api/jobs/:jobId/complete] notification failed:',
          notificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      payment_status: 'captured',
      status: 'completed',
      completed_at: completedAt,
    });
  } catch (err) {
    console.error('[POST /api/jobs/:jobId/complete] critical error:', err);

    return jsonError(
      err instanceof Error ? err.message : 'Internal server error',
      500
    );
  }
}