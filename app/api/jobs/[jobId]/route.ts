// app/api/jobs/[jobId]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('Token invalid:', userError?.message);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Mechanic check
    const { data: mechanic, error: mechErr } = await supabaseAdmin
      .from('mechanics')
      .select('id, verified')
      .eq('user_id', user.id)
      .maybeSingle();
    if (mechErr) {
      console.error('Mechanic query error:', mechErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 403 });
    }
    if (!mechanic.verified) {
      return NextResponse.json({ error: 'Mechanic account not verified' }, { status: 403 });
    }

    // Job check
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id, user_id, title, status')
      .eq('id', jobId)
      .maybeSingle();
    if (jobErr) {
      console.error('Job query error:', jobErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'open') {
      return NextResponse.json({ error: `Job is already ${job.status}` }, { status: 400 });
    }

    // Parse request body
    const { bid_amount, message } = await req.json();
    const parsedBid = parseFloat(bid_amount);
    if (isNaN(parsedBid) || parsedBid <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
    }
    if (!message?.trim() || message.trim().length < 10) {
      return NextResponse.json({ error: 'Proposal must be at least 10 characters' }, { status: 400 });
    }

    // Check for duplicate application
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('mechanic_id', mechanic.id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Duplicate application' }, { status: 409 });
    }

    // Insert application
    const { data: application, error: insertError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: jobId,
        mechanic_id: mechanic.id,
        bid_amount: parsedBid,
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Notify job owner (non‑blocking)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: job.user_id,
        type: 'application',
        title: 'New Bid Received',
        body: `£${parsedBid} offer for "${job.title}"`,
        metadata: { job_id: jobId, application_id: application.id },
      });
    } catch (notifErr) {
      console.warn('Notification failed, but application saved:', notifErr);
    }

    return NextResponse.json(application, { status: 201 });
  } catch (err: any) {
    console.error('Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}