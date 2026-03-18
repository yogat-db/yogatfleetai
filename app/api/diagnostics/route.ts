import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("*")

    const { data: services } = await supabase
      .from("services")
      .select("*")

    const fleetHealth =
      vehicles?.reduce((sum, v) => sum + (v.health_score || 70), 0) /
      (vehicles?.length || 1)

    const vehiclesAtRisk =
      vehicles?.filter(v => v.health_score < 50).length || 0

    return NextResponse.json({
      fleetHealth: Math.round(fleetHealth),
      vehiclesAtRisk,
      anomalies: [],
      predictions: []
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Diagnostics failed" },
      { status: 500 }
    )
  }
}