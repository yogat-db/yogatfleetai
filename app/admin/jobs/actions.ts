'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/admin-auth';

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

function normalizeJobId(jobId: string) {
  return typeof jobId === 'string' ? jobId.trim() : '';
}

function revalidateAdminJobViews() {
  revalidatePath('/admin/jobs');
  revalidatePath('/admin/dashboard');
}

async function getExistingJob(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('id, status, payment_status, assigned_mechanic_id')
    .eq('id', jobId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Job not found.');
  }

  return data;
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    const normalizedJobId = normalizeJobId(jobId);

    if (!normalizedJobId) {
      return { success: false, error: 'Invalid job ID.' };
    }

    await getExistingJob(normalizedJobId);

    const { error: applicationDeleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('job_id', normalizedJobId);

    if (applicationDeleteError) {
      return {
        success: false,
        error: `Failed to delete related applications: ${applicationDeleteError.message}`,
      };
    }

    const { error: jobDeleteError } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', normalizedJobId);

    if (jobDeleteError) {
      return {
        success: false,
        error:
          jobDeleteError.message.includes('foreign key') ||
          jobDeleteError.message.includes('violates foreign key')
            ? 'This job cannot be deleted because related records still exist.'
            : jobDeleteError.message,
      };
    }

    revalidateAdminJobViews();

    return {
      success: true,
      message: 'Job deleted successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete job.',
    };
  }
}

export async function cancelJob(jobId: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    const normalizedJobId = normalizeJobId(jobId);

    if (!normalizedJobId) {
      return { success: false, error: 'Invalid job ID.' };
    }

    const existingJob = await getExistingJob(normalizedJobId);

    if (existingJob.status === 'cancelled') {
      return { success: false, error: 'Job is already cancelled.' };
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', normalizedJobId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateAdminJobViews();

    return {
      success: true,
      message: 'Job cancelled successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel job.',
    };
  }
}

export async function reopenJob(jobId: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    const normalizedJobId = normalizeJobId(jobId);

    if (!normalizedJobId) {
      return { success: false, error: 'Invalid job ID.' };
    }

    const existingJob = await getExistingJob(normalizedJobId);

    if (existingJob.status === 'open') {
      return { success: false, error: 'Job is already open.' };
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'open',
        assigned_mechanic_id: null,
      })
      .eq('id', normalizedJobId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateAdminJobViews();

    return {
      success: true,
      message: 'Job reopened successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reopen job.',
    };
  }
}

export async function releasePayment(jobId: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    const normalizedJobId = normalizeJobId(jobId);

    if (!normalizedJobId) {
      return { success: false, error: 'Invalid job ID.' };
    }

    const existingJob = await getExistingJob(normalizedJobId);

    if (existingJob.payment_status === 'released') {
      return {
        success: false,
        error: 'Payment has already been released for this job.',
      };
    }

    const updatePayload: {
      payment_status: 'released';
      status?: string;
    } = {
      payment_status: 'released',
    };

    if (existingJob.status !== 'completed') {
      updatePayload.status = 'completed';
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update(updatePayload)
      .eq('id', normalizedJobId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateAdminJobViews();

    return {
      success: true,
      message: 'Payment released successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to release payment.',
    };
  }
}