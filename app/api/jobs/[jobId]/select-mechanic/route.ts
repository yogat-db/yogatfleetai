import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { mechanicId } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is the job owner
  const { data: job } = await supabase
    .from('jobs')
    .select('user_id, budget, assigned_mechanic_id, mechanic_stripe_account_id')
    .eq('id', jobId)
    .single();

  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (job.assigned_mechanic_id) {
    return NextResponse.json({ error: 'Job already assigned' }, { status: 400 });
  }

  // Get mechanic's Stripe account ID
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('stripe_account_id')
    .eq('id', mechanicId)
    .single();

  if (!mechanic?.stripe_account_id) {
    return NextResponse.json({ error: 'Mechanic not ready to receive payments' }, { status: 400 });
  }

  // Create PaymentIntent with manual capture
  const amountInPence = job.budget * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInPence,
    currency: 'gbp',
    capture_method: 'manual',
    metadata: { jobId, mechanicId },
    transfer_data: { destination: mechanic.stripe_account_id },
    statement_descriptor: 'Yogat Fleet Job',
  });

  // Update job record
  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      assigned_mechanic_id: mechanicId,
      payment_intent_id: paymentIntent.id,
      payment_status: 'pending',
      mechanic_stripe_account_id: mechanic.stripe_account_id,
    })
    .eq('id', jobId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}