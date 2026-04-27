'use server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getUserRole(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data?.role || null;
}