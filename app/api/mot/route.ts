import { NextResponse } from "next/server"

export async function GET(
 req: Request,
 { params }: { params: { plate: string } }
) {
 try {

  const plate = params.plate.toUpperCase().replace(/\s+/g, "")

  const res = await fetch(
   `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${plate}`,
   {
    headers: {
     "x-api-key": process.env.MOT_API_KEY!,
     "Accept": "application/json"
    }
   }
  )

  if (!res.ok) {
   const text = await res.text()

   return NextResponse.json(
    { error: "MOT API failed", detail: text },
    { status: res.status }
   )
  }

  const data = await res.json()

  return NextResponse.json({
   mot: data
  })

 } catch (e: any) {

  return NextResponse.json(
   { error: e.message ?? "MOT error" },
   { status: 500 }
  )
 }
}

