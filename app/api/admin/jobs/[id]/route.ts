// app/api/admin/jobs/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Helper to verify admin access
async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* no writes needed */ },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.role === 'admin' ? user : null;
}

// DELETE /api/admin/jobs/[id] – delete a job (admin only)
export async function DELETE(
  _request: Request,  // prefixed with underscore to indicate unused
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    // First delete related applications (if foreign key doesn't cascade)
    const { error: appError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('job_id', id);
    if (appError) {
      console.error('Failed to delete applications:', appError);
      // Continue anyway – the job deletion might still work
    }

    // Delete the job itself
    const { error: jobError } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);
    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/jobs/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}