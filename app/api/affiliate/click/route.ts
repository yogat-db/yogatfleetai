// app/api/affiliate/click/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, platform, destinationUrl } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Create Supabase client with anon key (no service role needed)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no writes needed */ },
        },
      }
    );

    // Get authenticated user (if any)
    const { data: { user } } = await supabase.auth.getUser();

    // Get IP address (works behind proxies)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || '';

    // Insert click record (using supabaseAdmin would bypass RLS, but anon is fine for INSERT if RLS policy allows)
    // If you have RLS enabled on affiliate_clicks, you may need to use serviceRole client.
    // For simplicity, we assume the table allows inserts from authenticated/anonymous with proper policy.
    const { error: insertError } = await supabase
      .from('affiliate_clicks')
      .insert({
        product_id: productId,
        platform: platform || 'unknown',
        destination_url: destinationUrl,
        user_id: user?.id || null,
        ip_address: ip,
        user_agent: userAgent,
        referer,
        clicked_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Affiliate Click] Insert error:', insertError.message);
      // Still return success to the client – tracking failure should not break the user experience.
      return NextResponse.json({ success: true, warned: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Affiliate Click] Unexpected error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}