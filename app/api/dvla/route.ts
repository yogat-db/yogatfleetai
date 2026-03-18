import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  context: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await context.params

    const res = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "x-api-key": process.env.DVLA_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          registrationNumber: plate
        })
      }
    )

    const data = await res.json()

    return NextResponse.json(data)

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: "DVLA lookup failed" },
      { status: 500 }
    )
  }
}