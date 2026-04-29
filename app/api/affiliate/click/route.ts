// app/api/affiliate/click/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = String(body?.productId || '').trim();
    const platform = String(body?.platform || 'unknown').trim();
    const destinationUrl = String(body?.destinationUrl || '').trim();

    // Validate required fields
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Optional: validate destinationUrl format (if provided, must be safe)
    if (destinationUrl && !isSafeHttpUrl(destinationUrl)) {
      console.warn(`[affiliate/click] Unsafe URL ignored: ${destinationUrl}`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}, // no writes needed
        },
      }
    );

    // Get authenticated user (if any)
    const { data: { user } } = await supabase.auth.getUser();

    // Get request metadata
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;
    const referer = request.headers.get('referer') || null;

    // Insert click record – non‑blocking, errors are logged but do not break the response
    const { error: insertError } = await supabase.from('affiliate_clicks').insert({
      product_id: productId,
      platform,
      destination_url: destinationUrl || null,
      user_id: user?.id || null,
      ip_address: ip,
      user_agent: userAgent,
      referer,
      clicked_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[affiliate/click] Supabase insert error:', insertError.message);
      // Do not return an error – we still want the client to redirect
    }

    // Return success; the client is responsible for opening the affiliate link
    return NextResponse.json({ success: true, productId });
  } catch (err) {
    console.error('[affiliate/click] Unexpected error:', err);
    // Return generic error, but try not to break the user experience
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}