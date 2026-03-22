import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/* =========================================
   Supabase Client
========================================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* =========================================
   Types
========================================= */

type MarketplaceRequest = {
  city: string
  vehicle_name?: string
  job_type: string
  urgency?: string
  symptoms?: string[]
  fault_codes?: string[]
}

type Quote = {
  id: string
  mechanic_name: string
  company?: string
  city: string
  price: number
  eta: string
  rating: number
  verified: boolean
  service_mode?: "mobile" | "garage"
  distance_miles?: number
  summary?: string
}

/* =========================================
   AI Price Estimator
========================================= */

function estimateRepairPrice(jobType: string) {
  const priceMap: Record<string, [number, number]> = {
    diagnostic: [60, 120],
    brakes: [150, 350],
    battery: [120, 250],
    engine: [400, 1200],
    cooling: [200, 450],
    transmission: [600, 1800],
    service: [120, 280],
    breakdown: [150, 500],
  }

  return priceMap[jobType] || [100, 300]
}

/* =========================================
   Mock AI Quote Generator
========================================= */

function generateMockQuotes(
  city: string,
  jobType: string
): Quote[] {

  const [min, max] = estimateRepairPrice(jobType)

  return [
    {
      id: crypto.randomUUID(),
      mechanic_name: "Rapid Mobile Mechanic",
      company: "RapidFix Fleet",
      city,
      price: Math.round((min + max) / 2),
      eta: "45 mins",
      rating: 4.8,
      verified: true,
      service_mode: "mobile",
      distance_miles: 1.2,
      summary: "Mobile mechanic specialising in fast fleet diagnostics.",
    },

    {
      id: crypto.randomUUID(),
      mechanic_name: "FleetFix Garage",
      company: "FleetFix UK",
      city,
      price: min + 40,
      eta: "2 hours",
      rating: 4.7,
      verified: true,
      service_mode: "garage",
      distance_miles: 3.8,
      summary: "Professional fleet repair centre with rapid turnaround.",
    },

    {
      id: crypto.randomUUID(),
      mechanic_name: "Urban Auto Tech",
      company: "Urban Mechanics",
      city,
      price: min + 20,
      eta: "1 hour",
      rating: 4.6,
      verified: false,
      service_mode: "mobile",
      distance_miles: 2.1,
      summary: "Independent mechanic with strong diagnostic experience.",
    },
  ]
}

/* =========================================
   POST Request
========================================= */

export async function POST(req: Request) {

  try {

    const body: MarketplaceRequest = await req.json()

    const {
      city,
      vehicle_name,
      job_type,
      urgency,
      symptoms,
      fault_codes
    } = body

    if (!city || !job_type) {
      return NextResponse.json(
        { error: "City and job_type required" },
        { status: 400 }
      )
    }

    /* =====================================
       Store repair request
    ===================================== */

    const { data: jobInsert } = await supabase
      .from("repair_jobs")
      .insert({
        city,
        vehicle_name,
        job_type,
        urgency,
        symptoms,
        fault_codes,
        status: "open",
      })
      .select()
      .single()

    const jobId = jobInsert?.id

    /* =====================================
       Try loading mechanic quotes
    ===================================== */

    let quotes: Quote[] = []

    if (jobId) {

      const { data: dbQuotes } = await supabase
        .from("job_quotes")
        .select("*")
        .eq("job_id", jobId)

      if (dbQuotes && dbQuotes.length > 0) {

        quotes = dbQuotes.map((q: any) => ({
          id: String(q.id),
          mechanic_name: q.mechanic_name,
          company: q.company,
          city: q.city,
          price: Number(q.price),
          eta: q.eta,
          rating: Number(q.rating ?? 4.5),
          verified: Boolean(q.verified ?? true),
          service_mode: q.service_mode ?? "garage",
          distance_miles: q.distance_miles ?? 2,
          summary: q.summary,
        }))
      }
    }

    /* =====================================
       If no quotes exist generate AI quotes
    ===================================== */

    if (quotes.length === 0) {
      quotes = generateMockQuotes(city, job_type)
    }

    return NextResponse.json({
      success: true,
      job_id: jobId,
      quotes
    })

  } catch (error) {

    console.error("Marketplace API Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Marketplace request failed"
      },
      { status: 500 }
    )
  }
}

/* =========================================
   Optional GET (health check)
========================================= */

export async function GET() {

  return NextResponse.json({
    status: "Marketplace AI API running"
  })
}
