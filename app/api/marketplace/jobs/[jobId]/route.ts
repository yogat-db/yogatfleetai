import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { jobId } = await params;

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      console.error('Job fetch error:', error);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Unexpected error in job API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}