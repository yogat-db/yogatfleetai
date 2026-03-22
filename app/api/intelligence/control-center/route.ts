// app/api/intelligence/control-center/route.ts
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

// GET /api/intelligence/control-center?from=2024-01-01&to=2024-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Example: fetch aggregated stats from various tables
    // You can replace these with actual queries based on your schema

    // Fetch total jobs count
    const { count: totalJobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (jobsError) throw jobsError;

    // Fetch active applications count
    const { count: activeApplications, error: appsError } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (appsError) throw appsError;

    // Fetch revenue (if you have a payments table)
    let revenue = 0;
    const { data: payments, error: revenueError } = await supabaseAdmin
      .from('payments')
      .select('amount');

    if (!revenueError && payments) {
      revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }

    // Return aggregated data
    return NextResponse.json(
      {
        totalJobs,
        activeApplications,
        revenue,
        period: { from, to },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Control center GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intelligence data' },
      { status: 500 }
    );
  }
}