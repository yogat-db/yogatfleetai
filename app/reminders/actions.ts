'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteReminder(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) throw new Error('Reminder ID is required');

  const supabase = await createClient(); // ✅ await

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be logged in to delete a reminder');

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete reminder');
  }

  revalidatePath('/service-reminders');
  redirect('/service-reminders');
}