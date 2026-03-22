// app/api/marketplace/applications/[applicationId]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// GET /api/marketplace/applications/:applicationId
export async function GET(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = params;

    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*, user:user_id(*), job:job_id(*)')
      .eq('id', applicationId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('GET application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/marketplace/applications/:applicationId – update status, etc.
interface UpdateApplicationPayload {
  status?: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  // other fields
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = params;
    const updates: UpdateApplicationPayload = await request.json();

    // Optional: authorization – check if user is the job poster or admin
    // You'd need to pass userId in request or get from auth session

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('PATCH application error:', error);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/marketplace/applications/:applicationId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = params;

    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (error) {
      console.error('DELETE application error:', error);
      return NextResponse.json(
        { error: 'Failed to delete application' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Application deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}