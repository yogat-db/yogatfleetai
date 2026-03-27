import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDTCInfo } from '@/lib/ai/diagnostics';
import type { Vehicle } from '@/app/types/fleet';

interface BreakdownResult {
  vehicle: Vehicle;
  riskLevel: 'low' | 'medium' | 'high';
  symptoms: string[];
  recommendedActions: string[];
  dtcCodes?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId, dtcCodes } = await req.json();

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Fetch vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', user.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Simulate AI analysis – replace with real AI call if needed
    // For now, return a mock breakdown analysis based on health score and DTCs
    const healthScore = vehicle.health_score ?? 100;
    const riskLevel = healthScore < 40 ? 'high' : healthScore < 70 ? 'medium' : 'low';

    let symptoms: string[] = [];
    let recommendedActions: string[] = [];

    if (riskLevel === 'high') {
      symptoms = ['Unusual engine noise', 'Check engine light on', 'Reduced fuel efficiency'];
      recommendedActions = ['Schedule immediate service', 'Do not drive long distances'];
    } else if (riskLevel === 'medium') {
      symptoms = ['Minor engine vibration', 'Slight decrease in performance'];
      recommendedActions = ['Schedule maintenance soon', 'Monitor for warning signs'];
    } else {
      symptoms = ['No immediate issues detected'];
      recommendedActions = ['Routine maintenance as per schedule'];
    }

    // If DTC codes are provided, enhance analysis
    let dtcInfo: string[] = [];
    if (dtcCodes && dtcCodes.length) {
      dtcInfo = dtcCodes.map((code: string) => getDTCInfo(code));
      symptoms.push(`Diagnostic trouble codes: ${dtcCodes.join(', ')}`);
      recommendedActions.push('Use OBD‑II scanner for detailed diagnostics');
    }

    const result: BreakdownResult = {
      vehicle,
      riskLevel,
      symptoms,
      recommendedActions,
      dtcCodes: dtcCodes || [],
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Breakdown detection error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}