import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata = {
  title: 'Manage Users | Admin',
};

async function makeAdmin(formData: FormData) {
  'use server';
  const userId = formData.get('userId') as string;
  await supabaseAdmin.from('admins').insert({ user_id: userId });
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export default async function AdminUsersPage() {
  // Fetch all users from auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  // Fetch existing admins
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from('admins')
    .select('user_id');
  if (adminsError) console.error('Failed to fetch admins:', adminsError);

  const adminIds = new Set(admins?.map(a => a.user_id) || []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>User Management</h1>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>User ID</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {authData.users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.id}</td>
                <td>{adminIds.has(user.id) ? '✓ Admin' : '—'}</td>
                <td>
                  <div className={styles.actions}>
                    {!adminIds.has(user.id) && (
                      <form action={makeAdmin}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className={styles.makeAdminButton}>
                          Make Admin
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}