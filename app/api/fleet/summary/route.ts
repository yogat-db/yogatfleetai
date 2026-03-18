import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Fetch all vehicles to calculate real summary data
    const { data: vehicles, error: vError } = await supabase
      .from("vehicles")
      .select("status");

    if (vError) {
      console.error("Summary Fetch Error:", vError.message);
      throw vError;
    }

    // 2. Calculate the actual counts based on your data
    const total = vehicles?.length || 0;
    // Default to 'healthy' if status is missing in DB
    const healthy = vehicles?.filter(v => (v.status || 'healthy') === 'healthy').length || 0;
    const warning = vehicles?.filter(v => v.status === 'warning').length || 0;
    const critical = vehicles?.filter(v => v.status === 'critical').length || 0;

    // 3. Return the JSON in the exact format your Dashboard expects
    return NextResponse.json({
      totalAssets: total,
      activeAlerts: warning + critical,
      fleetHealth: total > 0 ? Math.round((healthy / total) * 100) : 100,
      pendingService: 0,
      // This maps to the color-coded boxes on your dashboard
      statusCounts: {
        healthy: healthy,
        warning: warning,
        critical: critical
      }
    });

  } catch (err: any) {
    console.error("Critical Summary Error:", err.message);
    // Return zeros on failure so the UI stays alive
    return NextResponse.json({ 
      totalAssets: 0, 
      activeAlerts: 0,
      fleetHealth: 0,
      statusCounts: { healthy: 0, warning: 0, critical: 0 }
    }, { status: 200 });
  }
}