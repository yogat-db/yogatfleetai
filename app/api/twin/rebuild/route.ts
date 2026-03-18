import { NextResponse } from "next/server"
import { rebuildTwin } from "@/lib/vehicleAI/rebuildTwin"

export async function POST(req: Request) {

 try {

  const { vehicleId } = await req.json()

  if (!vehicleId)
   return NextResponse.json(
    { error: "vehicleId required" },
    { status: 400 }
   )

  const result = await rebuildTwin(vehicleId)

  return NextResponse.json({
   success: true,
   ...result
  })

 } catch (e: any) {

  return NextResponse.json(
   { error: e.message },
   { status: 500 }
  )

 }
}