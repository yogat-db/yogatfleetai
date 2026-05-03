import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { vehicleId, registration } = await req.json();
  const reg = (vehicleId ? null : registration) || registration;
  if (!reg) return NextResponse.json({ error: 'Registration required' }, { status: 400 });

  const apiKey = process.env.MOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'MOT API not configured' }, { status: 500 });

  try {
    const res = await fetch(
      `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(reg)}`,
      { headers: { 'x-api-key': apiKey, Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error(`MOT API error: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ error: 'No MOT history' }, { status: 404 });
    const latest = data.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())[0];
    const expiryDate = latest.expiryDate;
    const motStatus = expiryDate ? (new Date(expiryDate) > new Date() ? 'valid' : 'expired') : 'unknown';

    let query = supabase.from('vehicles').update({ mot_expiry: expiryDate, mot_status: motStatus });
    if (vehicleId) query = query.eq('id', vehicleId);
    else query = query.eq('license_plate', reg).eq('user_id', user.id);
    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, expiry: expiryDate, status: motStatus });
  } catch (err: any) {
    console.error('MOT sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}