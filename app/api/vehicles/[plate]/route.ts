// app/api/vehicles/[plate]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('license_plate', plate)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Vehicle lookup error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (err: any) {
    console.error('GET vehicle error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Find the vehicle
    const { data: vehicle, error: findError } = await supabase
      .from('vehicles')
      .select('id')
      .ilike('license_plate', plate)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) {
      console.error('Find vehicle error:', findError);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // 2. Delete dependent jobs (if foreign key does not have ON DELETE CASCADE)
    const { error: jobsError } = await supabase
      .from('jobs')
      .delete()
      .eq('vehicle_id', vehicle.id);
    if (jobsError) {
      console.error('Failed to delete jobs:', jobsError);
      // Continue – we still try to delete the vehicle
    }

    // 3. Delete the vehicle
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicle.id);

    if (deleteError) {
      console.error('Delete vehicle error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vehicle and associated jobs deleted' });
  } catch (err: any) {
    console.error('DELETE vehicle error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}