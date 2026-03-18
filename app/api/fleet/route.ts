import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plate, make, model, year, mileage, status } = body;

    const { data, error } = await supabase
      .from('vehicles')
      .insert([
        { 
          plate, 
          make, 
          model, 
          year: parseInt(year) || null, 
          mileage: parseInt(mileage) || 0,
          status: status || 'active', 
          health_score: 100 // Default for new vehicles
        }
      ])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}