'use server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as string;
  await supabaseAdmin.from('profiles').update({ role: newRole }).eq('id', userId);
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('userId') as string;
  await supabaseAdmin.from('mechanics').delete().eq('user_id', userId);
  await supabaseAdmin.from('jobs').delete().eq('user_id', userId);
  await supabaseAdmin.from('applications').delete().eq('user_id', userId);
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
  revalidatePath('/admin/users');
  redirect('/admin/users');
}