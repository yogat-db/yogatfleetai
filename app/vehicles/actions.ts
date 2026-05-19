'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteVehicle(formData: FormData) {
  const rawId = formData.get('id');
  const id = typeof rawId === 'string' ? rawId.trim() : '';

  if (!id) {
    throw new Error('Vehicle ID is required');
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to delete a vehicle');
  }

  const { error: deleteError } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Delete vehicle error:', deleteError);
    throw new Error('Failed to delete vehicle');
  }

  revalidatePath('/fleet');
  revalidatePath('/vehicles');
  redirect('/fleet');
}