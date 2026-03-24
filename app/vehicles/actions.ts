'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteVehicle(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) {
    throw new Error('Vehicle ID is required');
  }

  const supabase = createClient();

  // 1. Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to delete a vehicle');
  }

  // 2. Delete the vehicle (only if it belongs to the current user)
  const { data, error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select(); // returns the deleted row(s)

  if (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete vehicle. Please try again.');
  }

  // 3. If no rows were deleted, the vehicle either doesn't exist or isn't owned by the user
  if (!data || data.length === 0) {
    throw new Error('Vehicle not found or you do not have permission to delete it.');
  }

  // 4. Revalidate the fleet page and redirect
  revalidatePath('/fleet');
  redirect('/fleet');
}