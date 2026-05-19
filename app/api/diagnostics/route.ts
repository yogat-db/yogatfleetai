import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAdminAuth } from '@/lib/admin-auth';

type VehicleDiagnosticRow = {
  id: string;
  health_score: number | null;
  updated_at?: string | null;
  make?: string | null;
  model?: string | null;
  license_plate?: string | null;
};

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export async function GET() {
  try {
    const auth = await getAdminAuth();

    if (!auth?.user) {
      return jsonError('Unauthorized', 401);
    }

    if (!auth.isAdmin) {
      return jsonError('Forbidden', 403);
    }

    const { data: vehicles, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, health_score, updated_at, make, model, license_plate')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[GET /api/diagnostic] vehicles query failed:', error);
      return jsonError('Failed to load diagnostics data', 500, error.message);
    }

    const safeVehicles: VehicleDiagnosticRow[] = (vehicles ?? []).map((vehicle: any) => ({
      id: vehicle.id,
      health_score:
        typeof vehicle.health_score === 'number' ? vehicle.health_score : 70,
      updated_at: vehicle.updated_at ?? null,
      make: vehicle.make ?? null,
      model: vehicle.model ?? null,
      license_plate: vehicle.license_plate ?? null,
    }));

    const totalVehicles = safeVehicles.length;

    const fleetHealthRaw =
      totalVehicles > 0
        ? safeVehicles.reduce((sum, vehicle) => sum + (vehicle.health_score ?? 70), 0) /
          totalVehicles
        : 0;

    const vehiclesAtRisk = safeVehicles.filter(
      (vehicle) => (vehicle.health_score ?? 70) < 50
    ).length;

    const healthyVehicles = safeVehicles.filter(
      (vehicle) => (vehicle.health_score ?? 70) >= 80
    ).length;

    const mediumRiskVehicles = safeVehicles.filter((vehicle) => {
      const score = vehicle.health_score ?? 70;
      return score >= 50 && score < 80;
    }).length;

    const anomalies = safeVehicles
      .filter((vehicle) => (vehicle.health_score ?? 70) < 50)
      .slice(0, 10)
      .map((vehicle) => ({
        vehicle_id: vehicle.id,
        label:
          [vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
          vehicle.license_plate ||
          'Unknown vehicle',
        health_score: vehicle.health_score ?? 70,
        severity:
          (vehicle.health_score ?? 70) < 30 ? 'critical' : 'warning',
        updated_at: vehicle.updated_at ?? null,
      }));

    const predictions = safeVehicles
      .filter((vehicle) => (vehicle.health_score ?? 70) < 80)
      .slice(0, 10)
      .map((vehicle) => {
        const score = vehicle.health_score ?? 70;

        return {
          vehicle_id: vehicle.id,
          label:
            [vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
            vehicle.license_plate ||
            'Unknown vehicle',
          health_score: score,
          predicted_issue:
            score < 30
              ? 'Immediate maintenance recommended'
              : score < 50
              ? 'High failure risk'
              : 'Preventive maintenance due soon',
        };
      });

    return NextResponse.json({
      success: true,
      summary: {
        totalVehicles,
        fleetHealth: Math.round(fleetHealthRaw),
        vehiclesAtRisk,
        healthyVehicles,
        mediumRiskVehicles,
      },
      anomalies,
      predictions,
    });
  } catch (error) {
    console.error('[GET /api/diagnostic] unexpected error:', error);

    return jsonError(
      'Diagnostics failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}