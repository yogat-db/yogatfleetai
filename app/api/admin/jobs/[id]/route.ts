import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ADMIN JOB DELETION
 * Force deletes a job and its associated dependencies.
 */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Required for Admin overrides
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
        },
        global: {
          fetch: (url: string | Request | URL, options: RequestInit | undefined) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                'Accept-Encoding': 'identity', // Mac stability fix
              },
            });
          },
        },
      }
    );

    // 1. Verify Requesting User is an Admin
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // 2. Clean up dependencies manually (If Cascade is not set in DB)
    // Delete applications first
    await supabase.from('applications').delete().eq('job_id', id);
    // Delete messages
    await supabase.from('messages').delete().eq('job_id', id);
    // Delete reviews
    await supabase.from('reviews').delete().eq('job_id', id);

    // 3. Delete the Job
    const { error: jobError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (jobError) throw jobError;

    return NextResponse.json({ success: true, message: 'Job and related data purged.' });

  } catch (err: any) {
    console.error('ADMIN_DELETE_ERROR:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}