import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeFleetBrain } from '@/lib/ai';

export async function GET(request: Request) {
  // Optional: verify a secret token to prevent public access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  // Fetch all vehicles (or paginate if many)
  const { data: vehicles, error } = await supabase.from('vehicles').select('*');
  if (error) throw error;

  const enriched = computeFleetBrain(vehicles);

  // Update each vehicle's health_score (and optionally risk, etc.)
  for (const vehicle of enriched) {
    await supabase
      .from('vehicles')
      .update({
        health_score: vehicle.health_score,
        // risk: vehicle.risk, // if you add a risk column
      })
      .eq('id', vehicle.id);
  }

  return NextResponse.json({ updated: enriched.length });
}