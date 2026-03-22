'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteJob(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const { error } = await supabaseAdmin
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete failed:', error);
    throw new Error('Failed to delete job');
  }

  revalidatePath('/admin/jobs');
  redirect('/admin/jobs');
}

export async function releasePayment(formData: FormData) {
  const jobId = formData.get('jobId') as string;
  const paymentIntentId = formData.get('paymentIntentId') as string;
  if (!jobId || !paymentIntentId) return;

  try {
    // Capture the held payment
    await stripe.paymentIntents.capture(paymentIntentId);

    // Update job record
    await supabaseAdmin
      .from('jobs')
      .update({ payment_status: 'released' })
      .eq('id', jobId);
  } catch (err) {
    console.error('Release payment failed:', err);
    throw new Error('Could not release payment');
  }

  revalidatePath('/admin/jobs');
  redirect('/admin/jobs');
}

