'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type AdminAuthResult = {
  user: {
    id: string;
    email?: string | null;
  };
  isAdmin: boolean;
};

export async function checkAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Admin check failed:', error);
    return false;
  }

  return data?.role === 'admin';
}

export async function getAdminAuth(): Promise<AdminAuthResult | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const isAdmin = await checkAdmin(user.id);

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    isAdmin,
  };
}

export async function requireAdmin() {
  const auth = await getAdminAuth();

  if (!auth?.user) {
    redirect('/login');
  }

  if (!auth.isAdmin) {
    redirect('/dashboard');
  }

  return auth.user;
}

export async function assertAdmin() {
  const auth = await getAdminAuth();

  if (!auth?.user) {
    throw new Error('UNAUTHENTICATED');
  }

  if (!auth.isAdmin) {
    throw new Error('FORBIDDEN');
  }

  return auth.user;
}