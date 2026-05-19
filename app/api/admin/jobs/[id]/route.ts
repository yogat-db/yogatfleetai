import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAdminAuth } from '@/lib/admin-auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JsonErrorDetails = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

function jsonError(message: string, status: number, details?: JsonErrorDetails) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

async function requireAdminJson() {
  const auth = await getAdminAuth();

  if (!auth?.user) {
    return { error: jsonError('Unauthorized', 401) };
  }

  if (!auth.isAdmin) {
    return { error: jsonError('Forbidden', 403) };
  }

  return { user: auth.user };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminJson();
    if (admin.error) return admin.error;

    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return jsonError('Missing or invalid job ID', 400);
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (!action || typeof action !== 'string') {
      return jsonError('Missing action', 400);
    }

    if (action === 'cancel') {
      const { error } = await supabaseAdmin
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        return jsonError('Failed to cancel job', 500, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }

      return NextResponse.json({
        success: true,
        updatedId: id,
        action: 'cancel',
        message: 'Job cancelled successfully',
      });
    }

    if (action === 'reopen') {
      const { error } = await supabaseAdmin
        .from('jobs')
        .update({ status: 'open', assigned_mechanic_id: null })
        .eq('id', id);

      if (error) {
        return jsonError('Failed to reopen job', 500, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }

      return NextResponse.json({
        success: true,
        updatedId: id,
        action: 'reopen',
        message: 'Job reopened successfully',
      });
    }

    return jsonError('Unsupported action', 400);
  } catch (error) {
    console.error('[PATCH /api/admin/jobs/[id]] unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminJson();
    if (admin.error) return admin.error;

    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return jsonError('Missing or invalid job ID', 400);
    }

    const { data: existingJob, error: existingJobError } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('id', id)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingJobError) {
      console.error('[DELETE /api/admin/jobs/[id]] failed job lookup:', existingJobError);
      return jsonError('Failed to verify job before deletion', 500, {
        message: existingJobError.message,
        code: existingJobError.code,
        details: existingJobError.details,
        hint: existingJobError.hint,
      });
    }

    if (!existingJob) {
      return jsonError('Job not found', 404);
    }

    const { error: applicationDeleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('job_id', id);

    if (applicationDeleteError) {
      console.error(
        '[DELETE /api/admin/jobs/[id]] failed application cleanup:',
        applicationDeleteError
      );
      return jsonError('Failed to delete related applications', 500, {
        message: applicationDeleteError.message,
        code: applicationDeleteError.code,
        details: applicationDeleteError.details,
        hint: applicationDeleteError.hint,
      });
    }

    const { error: jobDeleteError } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (jobDeleteError) {
      console.error('[DELETE /api/admin/jobs/[id]] failed job delete:', jobDeleteError);
      return jsonError('Failed to delete job', 500, {
        message: jobDeleteError.message,
        code: jobDeleteError.code,
        details: jobDeleteError.details,
        hint: jobDeleteError.hint,
      });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/admin/jobs/[id]] unexpected error:', error);

    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}