import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const supabase = await createClient(); // ✅ await here

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*),
        mechanic:mechanics(*)
      `)
      .eq('id', applicationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET application error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const { status } = await req.json();

    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = await createClient(); // ✅ await here

    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    if (status === 'accepted') {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'assigned',
          assigned_mechanic_id: data.mechanic_id,
        })
        .eq('id', data.job_id);
      if (jobError) {
        console.error('Failed to update job:', jobError);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('PATCH application error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}