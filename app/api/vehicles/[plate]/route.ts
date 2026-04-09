import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the vehicle by license_plate AND user_id (security)
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('license_plate', plate.toUpperCase())
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}