import { supabaseAdmin } from '@/lib/supabase/admin'
import { Trash2, Mail, Calendar, Shield, AlertCircle } from 'lucide-react'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  is_admin: boolean
  mechanic_profile?: {
    business_name: string
    subscription_status: string
  } | null
}

export default async function AdminUsersPage() {
  // Fetch users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) throw new Error(authError.message)

  // Fetch admins
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from('admins')
    .select('id')
  if (adminsError) throw new Error(adminsError.message)

  const adminSet = new Set(admins?.map(a => a.id) || [])

  // Fetch mechanic profiles
  const { data: mechanics, error: mechanicsError } = await supabaseAdmin
    .from('mechanics')
    .select('user_id, business_name, subscription_status')
  if (mechanicsError) throw new Error(mechanicsError.message)

  const mechanicMap = new Map(mechanics?.map(m => [m.user_id, m]) || [])

  const users: User[] = (authData?.users || []).map(user => ({
    id: user.id,
    email: user.email || '',
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at || null,
    is_admin: adminSet.has(user.id),
    mechanic_profile: mechanicMap.get(user.id) || null,
  }))

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>User Management</h1>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Joined</th>
              <th>Last Sign In</th>
              <th>Role</th>
              <th>Mechanic</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={styles.emailCell}>
                    <Mail size={14} color="#64748b" />
                    {user.email}
                  </div>
                </td>
                <td>
                  <div style={styles.dateCell}>
                    <Calendar size={14} color="#64748b" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td>
                  <form action={async () => {
                    'use server'
                    // Toggle admin status – this would require a server action
                    // For simplicity, we'll just show a link to an API route
                  }}>
                    <button
                      style={{
                        ...styles.roleButton,
                        background: user.is_admin ? '#22c55e20' : '#1e293b',
                        color: user.is_admin ? '#22c55e' : '#94a3b8',
                      }}
                    >
                      <Shield size={14} />
                      {user.is_admin ? 'Admin' : 'User'}
                    </button>
                  </form>
                </td>
                <td>
                  {user.mechanic_profile ? (
                    <div>
                      <div>{user.mechanic_profile.business_name}</div>
                      <div style={getSubscriptionBadgeStyle(user.mechanic_profile.subscription_status)}>
                        {user.mechanic_profile.subscription_status}
                      </div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button style={styles.deleteButton}>
                    <Trash2 size={16} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const getSubscriptionBadgeStyle = (status: string) => ({
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '12px',
  fontSize: '10px',
  fontWeight: 500,
  background: status === 'active' ? '#22c55e20' : '#ef444420',
  color: status === 'active' ? '#22c55e' : '#ef4444',
  marginTop: '4px',
})

const styles = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 32, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  tableWrapper: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  emailCell: { display: 'flex', alignItems: 'center', gap: 8 },
  dateCell: { display: 'flex', alignItems: 'center', gap: 8 },
  roleButton: { display: 'flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 12, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  deleteButton: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
} as const
