import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      user_id, vehicle_id, job_type, symptoms, 
      fault_codes, city, postcode, lat, lng, 
      preferred_date, notes 
    } = body;

    if (!job_type || !vehicle_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("quote_requests")
      .insert([{
        user_id,
        vehicle_id,
        job_type,
        symptoms: symptoms || [],
        fault_codes: fault_codes || [],
        city,
        postcode,
        location: `POINT(${lng} ${lat})`, // PostGIS format if enabled
        preferred_date,
        notes,
        status: "open"
      }])
      .select().single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}