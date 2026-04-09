import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { computeFleetBrain } from '@/lib/ai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Get all vehicles
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('*');

    if (vehiclesError) throw vehiclesError;

    // Compute real health scores using your AI logic
    const enriched = computeFleetBrain(vehicles || []);
    
    const totalVehicles = enriched.length;
    const avgHealth = totalVehicles > 0 
      ? Math.round(enriched.reduce((sum, v) => sum + v.health_score, 0) / totalVehicles)
      : 0;
    const highRiskCount = enriched.filter(v => v.risk === 'high').length;
    const predictedMaintenanceCost = enriched.reduce((sum, v) => sum + (v.estimatedRepairCost || 0), 0);

    // Other stats (jobs, applications, revenue) – keep as before
    const { count: totalJobs } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    const { count: activeApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    let revenue = 0;
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount');
    if (payments) {
      revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }

    return NextResponse.json({
      totalVehicles,
      averageHealth: avgHealth,
      highRiskCount,
      predictedMaintenanceCost,
      totalJobs,
      activeApplications,
      revenue,
      period: { from, to },
    });
  } catch (error) {
    console.error('Control center error:', error);
    return NextResponse.json({ error: 'Failed to fetch intelligence data' }, { status: 500 });
  }
}