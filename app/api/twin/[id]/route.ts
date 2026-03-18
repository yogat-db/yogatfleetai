import { NextResponse } from "next/server"
import { buildVehicleIntelligence } from "@/lib/vehicleAI/vehicleIntelligence"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  try {

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { success:false, error:"Vehicle ID missing" },
        { status:400 }
      )
    }

    const plate = id.toUpperCase().replace(/\s+/g, "")

    const intelligence = await buildVehicleIntelligence(plate)

    return NextResponse.json({
      success:true,
      vehicle:{ plate },
      intelligence
    })

  } catch (error:any) {

    console.error("Digital Twin API error:", error)

    return NextResponse.json(
      {
        success:false,
        error:error.message || "Twin intelligence failed"
      },
      { status:500 }
    )

  }

}