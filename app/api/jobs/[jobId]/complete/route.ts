import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is the job owner
  const { data: job } = await supabase
    .from('jobs')
    .select('user_id, payment_intent_id, payment_status')
    .eq('id', jobId)
    .single();

  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (job.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
  }

  // Capture the payment
  await stripe.paymentIntents.capture(job.payment_intent_id);

  // Update job and payment status
  await supabase
    .from('jobs')
    .update({ payment_status: 'captured', status: 'completed' })
    .eq('id', jobId);

  // (Optional) Notify admin via email or push notification

  return NextResponse.json({ success: true });
}