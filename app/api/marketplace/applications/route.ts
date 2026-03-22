// app/api/marketplace/applications/route.ts
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

// GET /api/marketplace/applications?jobId=123&userId=456&status=pending&limit=10&offset=0
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin.from('applications').select('*, user:user_id(*), job:job_id(*)', { count: 'exact' });

    if (jobId) query = query.eq('job_id', jobId);
    if (userId) query = query.eq('user_id', userId);
    if (status) query = query.eq('status', status);

    const { data: applications, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Applications GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications, count }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in applications GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/marketplace/applications – create a new application
interface CreateApplicationPayload {
  job_id: string;
  user_id: string;
  cover_letter?: string;
  resume_url?: string;
  additional_info?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateApplicationPayload = await request.json();

    // Validation
    if (!body.job_id || !body.user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, user_id' },
        { status: 400 }
      );
    }

    // Check if user already applied for this job
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', body.job_id)
      .eq('user_id', body.user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for this job' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        ...body,
        status: 'pending',
        applied_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Applications POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Optional: Send notifications via Resend (similar to earlier example)
    // ...

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in applications POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}