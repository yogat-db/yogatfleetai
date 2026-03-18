import { NextResponse } from "next/server"
import { runVehicleLookup } from "@/lib/vehicleAI/lookup"

export async function GET(
  req: Request,
  context: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await context.params

    if (!plate) {
      return NextResponse.json(
        {
          success: false,
          error: "Plate parameter missing"
        },
        { status: 400 }
      )
    }

    const normalizedPlate = plate
      .toUpperCase()
      .replace(/\s+/g, "")

    const result = await runVehicleLookup(normalizedPlate)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle not found"
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      plate: normalizedPlate,
      vehicle: result
    })

  } catch (err: any) {
    console.error("Lookup API error:", err)

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Vehicle lookup failed"
      },
      { status: 500 }
    )
  }
}