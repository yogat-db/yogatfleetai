// app/admin/users/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { UsersTableClient } from './UsersTableClient';

export const metadata = { title: 'User Management | Admin Console' };

export default async function AdminUsersPage() {
  await requireAdmin(); // protects the page, redirects if not admin

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Error loading users: {error.message}</div>;
  }

  return <UsersTableClient initialUsers={profiles || []} />;
}