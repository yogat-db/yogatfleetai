import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type ApplyJobBody = {
  bid_amount: number | string;
  message: string;
};

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extra ?? {}),
    },
    { status }
  );
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { jobId } = await params;

    if (!jobId?.trim()) {
      return jsonError('Missing job ID', 400);
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return jsonError('Missing authorization token', 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[POST /api/jobs/:jobId/apply] token invalid:', userError);
      return jsonError('Invalid or expired token', 401);
    }

    let body: ApplyJobBody;

    try {
      body = (await req.json()) as ApplyJobBody;
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsedBid = Number(body.bid_amount);
    const trimmedMessage = body.message?.trim?.() ?? '';

    if (!Number.isFinite(parsedBid) || parsedBid <= 0) {
      return jsonError('Invalid bid amount', 400);
    }

    if (trimmedMessage.length < 10) {
      return jsonError(
        'Proposal must be at least 10 characters',
        400
      );
    }

    const { data: mechanic, error: mechErr } = await supabaseAdmin
      .from('mechanics')
      .select('id, verified')
      .eq('user_id', user.id)
      .maybeSingle();

    if (mechErr) {
      console.error(
        '[POST /api/jobs/:jobId/apply] mechanic query error:',
        mechErr
      );
      return jsonError('Database error', 500, {
        code: mechErr.code,
        details: mechErr.details,
        hint: mechErr.hint,
      });
    }

    if (!mechanic) {
      return jsonError('Mechanic profile not found', 403);
    }

    if (!mechanic.verified) {
      return jsonError('Mechanic account not verified', 403);
    }

    const { data: job, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id, user_id, title, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr) {
      console.error(
        '[POST /api/jobs/:jobId/apply] job query error:',
        jobErr
      );
      return jsonError('Database error', 500, {
        code: jobErr.code,
        details: jobErr.details,
        hint: jobErr.hint,
      });
    }

    if (!job) {
      return jsonError('Job not found', 404);
    }

    if (job.user_id === user.id) {
      return jsonError('You cannot apply to your own job', 400);
    }

    if (job.status !== 'open') {
      return jsonError(`Job is already ${job.status}`, 400);
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('job_id', jobId)
      .eq('mechanic_id', mechanic.id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (existingError) {
      console.error(
        '[POST /api/jobs/:jobId/apply] duplicate check error:',
        existingError
      );
      return jsonError('Database error', 500, {
        code: existingError.code,
        details: existingError.details,
        hint: existingError.hint,
      });
    }

    if (existing) {
      return jsonError(
        'You have already applied to this job',
        409
      );
    }

    const { data: application, error: insertError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: jobId,
        mechanic_id: mechanic.id,
        bid_amount: parsedBid,
        message: trimmedMessage,
        status: 'pending',
      })
      .select(
        'id, job_id, mechanic_id, bid_amount, message, status, created_at'
      )
      .single();

    if (insertError || !application) {
      console.error(
        '[POST /api/jobs/:jobId/apply] insert error:',
        insertError
      );
      return jsonError(
        insertError?.message || 'Failed to create application',
        500
      );
    }

    try {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: job.user_id,
          type: 'application',
          title: 'New Bid Received',
          body: `£${parsedBid} offer for "${job.title}"`,
          metadata: {
            job_id: jobId,
            application_id: application.id,
          },
        });

      if (notifError) {
        console.warn(
          '[POST /api/jobs/:jobId/apply] notification failed:',
          notifError
        );
      }
    } catch (notifErr) {
      console.warn(
        '[POST /api/jobs/:jobId/apply] notification threw, but application saved:',
        notifErr
      );
    }

    return NextResponse.json(
      {
        success: true,
        application,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      '[POST /api/jobs/:jobId/apply] unhandled error:',
      err
    );

    return jsonError(
      err instanceof Error ? err.message : 'Internal server error',
      500
    );
  }
}