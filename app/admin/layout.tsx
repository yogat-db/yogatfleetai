'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Mail, Calendar, Shield, AlertCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch users from auth.users (requires service role)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      if (authError) throw authError

      // Fetch admin list
      const { data: admins, error: adminsError } = await supabaseAdmin
        .from('admins')
        .select('id')
      if (adminsError) throw adminsError

      const adminSet = new Set(admins?.map(a => a.id) || [])

      // Fetch mechanic profiles
      const { data: mechanics, error: mechanicsError } = await supabaseAdmin
        .from('mechanics')
        .select('user_id, business_name, subscription_status')
      if (mechanicsError) throw mechanicsError

      const mechanicMap = new Map(mechanics?.map(m => [m.user_id, m]) || [])

      const enrichedUsers: User[] = (authData?.users || []).map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        is_admin: adminSet.has(user.id),
        mechanic_profile: mechanicMap.get(user.id) || null,
      }))

      setUsers(enrichedUsers)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    setDeleting(userId)
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      setUsers(users.filter(u => u.id !== userId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      if (makeAdmin) {
        await supabaseAdmin.from('admins').insert({ id: userId })
      } else {
        await supabaseAdmin.from('admins').delete().eq('id', userId)
      }
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: makeAdmin } : u
      ))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <AlertCircle size={32} color="#ef4444" />
        <p>{error}</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
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
                  <button
                    onClick={() => toggleAdmin(user.id, !user.is_admin)}
                    style={{
                      ...styles.roleButton,
                      background: user.is_admin ? '#22c55e20' : '#1e293b',
                      color: user.is_admin ? '#22c55e' : '#94a3b8',
                    }}
                  >
                    <Shield size={14} />
                    {user.is_admin ? 'Admin' : 'User'}
                  </button>
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
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deleting === user.id}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} />
                    {deleting === user.id ? '...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '32px',
  },
  tableWrapper: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  emailCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none',
    borderRadius: '12px',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}