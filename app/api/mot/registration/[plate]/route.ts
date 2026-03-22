import { NextResponse } from "next/server"

export async function GET(
 req: Request,
 { params }: { params: { plate: string } }
) {

 const res = await fetch(
  `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${params.plate}`,
  {
   headers: {
    "x-api-key": process.env.MOT_API_KEY!,
    "Accept": "application/json"
   }
  }
 )

 const data = await res.json()

 return NextResponse.json(data)
}

