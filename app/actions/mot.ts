'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export async function fetchAndStoreMOT(vehicleId: string, registration: string, userId: string) {
  const cleanReg = registration.toUpperCase().replace(/\s+/g, '');
  const apiKey = process.env.MOT_API_KEY;
  if (!apiKey) return { error: 'MOT API not configured' };

  try {
    const res = await fetch(
      `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${cleanReg}`,
      {
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      }
    );
    if (!res.ok) return { error: `MOT fetch failed: ${res.status}` };

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { error: 'No MOT history' };

    // Get the latest MOT test
    const latest = data.sort((a, b) => 
      new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    )[0];
    const expiryDate = latest.expiryDate;
    const motStatus = expiryDate ? (new Date(expiryDate) > new Date() ? 'valid' : 'expired') : 'unknown';

    // Store in vehicles table (add columns: mot_expiry, mot_status)
    const { error } = await supabaseAdmin
      .from('vehicles')
      .update({ mot_expiry: expiryDate, mot_status: motStatus })
      .eq('id', vehicleId)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { success: true, expiry: expiryDate, status: motStatus };
  } catch (err: any) {
    return { error: err.message };
  }
}