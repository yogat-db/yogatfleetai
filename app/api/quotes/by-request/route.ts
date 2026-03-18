import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("quotes") // This table stores mechanic bids
    .select(`
      *,
      mechanic:mechanic_profiles(*)
    `)
    .eq("request_id", requestId)
    .order("total_price_pence", { ascending: true }); // Best price first

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}