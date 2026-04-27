import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Mail, Calendar, Trash2, AlertCircle } from 'lucide-react';
import theme from '@/app/theme';

export const metadata = { title: 'User Management | Admin Console' };

// ---------- Helper to get the current user and verify admin ----------
async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  
  // Create server client that properly reads/writes cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore – this happens during static generation
          }
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('Auth error in admin page:', error?.message);
    return null;
  }
  
  // Check admin role via supabaseAdmin (bypasses RLS)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  if (!profile || profile.role !== 'admin') return null;
  return user;
}

// ---------- Server Actions ----------
async function updateUserRole(formData: FormData) {
  'use server';
  const user = await getAuthenticatedAdmin();
  if (!user) redirect('/login');

  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as string;
  if (!userId || !newRole) throw new Error('Missing user ID or role');

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error(`Role update failed: ${error.message}`);
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

async function deleteUser(formData: FormData) {
  'use server';
  const user = await getAuthenticatedAdmin();
  if (!user) redirect('/login');

  const userId = formData.get('userId') as string;
  if (!userId) throw new Error('User ID required');
  
  // Delete related data
  await supabaseAdmin.from('mechanics').delete().eq('user_id', userId);
  await supabaseAdmin.from('jobs').delete().eq('user_id', userId);
  await supabaseAdmin.from('applications').delete().eq('user_id', userId);
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

// ---------- Page Component ----------
export default async function AdminUsersPage() {
  // Verify admin before rendering anything
  const adminUser = await getAuthenticatedAdmin();
  if (!adminUser) redirect('/login');

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2>Error loading users</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>User Management</h1>
        <p style={styles.subtitle}>Total: <strong>{profiles?.length || 0}</strong> users</p>
      </header>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeader}>User</th>
              <th style={styles.tableHeader}>Role</th>
              <th style={styles.tableHeader}>Joined</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map(profile => (
              <tr key={profile.id} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <div style={styles.userName}>{profile.full_name || 'Anonymous'}</div>
                  <div style={styles.userEmail}><Mail size={12} /> {profile.email || 'No email'}</div>
                </td>
                <td style={styles.tableCell}>
                  <form action={updateUserRole} style={styles.roleForm}>
                    <input type="hidden" name="userId" value={profile.id} />
                    <select name="role" defaultValue={profile.role || 'user'} style={styles.roleSelect}>
                      <option value="user">User</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="admin">Admin</option>
                    </select>
                  </form>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.date}><Calendar size={12} /> {new Date(profile.created_at).toLocaleDateString()}</div>
                </td>
                <td style={styles.tableCell}>
                  <form action={deleteUser}>
                    <input type="hidden" name="userId" value={profile.id} />
                    <button type="submit" style={styles.deleteButton} onClick={e => {
                      if (!confirm(`Delete ${profile.full_name || profile.email} permanently?`)) e.preventDefault();
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Styles (unchanged but kept compact) ==========
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '40px', background: theme.colors.background.main, minHeight: '100vh', fontFamily: theme.fontFamilies.sans },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', marginBottom: '4px' },
  subtitle: { color: theme.colors.text.secondary, fontSize: '14px' },
  tableWrapper: { background: theme.colors.background.card, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${theme.colors.border.light}` },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { background: theme.colors.background.subtle, borderBottom: `1px solid ${theme.colors.border.light}` },
  tableHeader: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: theme.colors.text.muted, fontWeight: 700 },
  tableRow: { borderBottom: `1px solid ${theme.colors.border.light}` },
  tableCell: { padding: '20px 24px', verticalAlign: 'middle' },
  userName: { fontWeight: 700, color: theme.colors.text.primary, marginBottom: '4px' },
  userEmail: { fontSize: '13px', color: theme.colors.text.secondary, display: 'flex', alignItems: 'center', gap: '6px' },
  roleForm: { display: 'inline-block' },
  roleSelect: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '8px', padding: '6px 12px', color: theme.colors.text.primary, fontSize: '13px', cursor: 'pointer' },
  date: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.colors.text.secondary },
  deleteButton: { background: 'transparent', border: `1px solid ${theme.colors.status.critical}40`, borderRadius: '8px', padding: '6px 10px', color: theme.colors.status.critical, cursor: 'pointer' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: theme.colors.text.primary, gap: '16px', textAlign: 'center', padding: '40px' },
};