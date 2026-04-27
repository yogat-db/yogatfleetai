// app/actions/reminders.ts (or wherever your server actions live)
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteReminder(formData: FormData) {
  // 1. Extract and validate the ID
  const id = formData.get('id') as string;
  if (!id || typeof id !== 'string') {
    throw new Error('Valid reminder ID is required');
  }

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Authentication error in deleteReminder:', userError);
    throw new Error('You must be logged in to delete a reminder');
  }

  // 3. Attempt deletion – ensure user owns the reminder
  const { error: deleteError } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  // 4. Handle deletion errors
  if (deleteError) {
    console.error('Delete reminder error:', deleteError);
    // Distinguish between "not found" and other DB errors
    if (deleteError.code === 'PGRST116') {
      throw new Error('Reminder not found or already deleted');
    }
    throw new Error('Failed to delete reminder. Please try again.');
  }

  // 5. Revalidate and redirect
  revalidatePath('/service-reminders');
  revalidatePath('/dashboard'); // if reminders appear on dashboard
  redirect('/service-reminders');
}