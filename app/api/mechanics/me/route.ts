import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: mechanic, error } = await supabase
      .from('mechanics')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('MECHANIC_ME_ERROR', error);
      return NextResponse.json(
        { error: 'Failed to load mechanic profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mechanic });
  } catch (error) {
    console.error('MECHANIC_ME_UNEXPECTED', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}