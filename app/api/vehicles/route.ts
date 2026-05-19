import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return jsonError(authError.message, 401);
    }

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Vehicles fetch error:', error);
      return jsonError(error.message, 500);
    }

    return jsonSuccess(vehicles ?? []);
  } catch (error) {
    console.error('GET /api/vehicles error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}