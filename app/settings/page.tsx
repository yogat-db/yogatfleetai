'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { supabase } from '@/lib/supabase/client'

// ... rest of your component unchanged

// ... rest of your component remains exactly the same

type MechanicProfile = {
  id: string
  business_name: string
  phone: string | null
  address: string | null
  subscription_status: 'active' | 'inactive' | 'past_due'
  stripe_account_id: string | null
}

type UserPreferences = {
  email_notifications: boolean
  push_notifications: boolean
}


export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    push_notifications: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Profile form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Email change form
  const [newEmail, setNewEmail] = useState('')
  const [emailChanging, setEmailChanging] = useState(false)

  // Password change form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setFullName(user.user_metadata?.full_name || '')
      setNewEmail(user.email || '')

      // Load preferences
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('email_notifications, push_notifications')
        .eq('user_id', user.id)
        .single()

      if (prefsError && prefsError.code !== 'PGRST116') { // not found
        console.error('Error loading preferences:', prefsError)
      }
      if (prefs) {
        setPreferences(prefs)
      } else {
        // Insert default preferences
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id })
        if (!insertError) {
          setPreferences({ email_notifications: true, push_notifications: false })
        }
      }

      // Load mechanic profile if exists
      const { data: mechanicData } = await supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (mechanicData) {
        setMechanic(mechanicData)
        setPhone(mechanicData.phone || '')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Update profile (name & phone)
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      // Update auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })
      if (updateError) throw updateError

      // Update mechanic profile if exists
      if (mechanic) {
        const { error: mechError } = await supabase
          .from('mechanics')
          .update({ phone })
          .eq('id', mechanic.id)
        if (mechError) throw mechError
      }

      setSuccess('Profile updated successfully')
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Update notification preferences
  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user?.id, [key]: value }, { onConflict: 'user_id' })
      if (error) throw error
      setSuccess('Preferences updated')
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Change email (requires confirmation)
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setEmailChanging(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setSuccess('Confirmation email sent. Please check your inbox.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEmailChanging(false)
    }
  }

  // Change password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccess('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This action cannot be undone.')) return
    // Note: Deleting user requires admin API or custom function
    alert('Account deletion not implemented in this demo')
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading settings...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Settings</h1>

      <div style={styles.grid}>
        {/* Profile Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <User size={20} color="#94a3b8" />
            <h2 style={styles.cardTitle}>Profile Information</h2>
          </div>
          <form onSubmit={handleProfileUpdate}>
            <div style={styles.field}>
              <label style={styles.label}>Email (cannot be changed here)</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ ...styles.input, opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
              />
            </div>
            {mechanic && (
              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}
            <button type="submit" style={styles.saveButton}>
              Save Changes
            </button>
          </form>
        </motion.div>

        {/* Email Change Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <Mail size={20} color="#94a3b8" />
            <h2 style={styles.cardTitle}>Change Email</h2>
          </div>
          <form onSubmit={handleEmailChange}>
            <div style={styles.field}>
              <label style={styles.label}>New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={emailChanging} style={styles.saveButton}>
              {emailChanging ? 'Sending...' : 'Update Email'}
            </button>
            <p style={styles.note}>
              You will receive a confirmation email at the new address.
            </p>
          </form>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <Bell size={20} color="#94a3b8" />
            <h2 style={styles.cardTitle}>Notifications</h2>
          </div>
          <div style={styles.toggleGroup}>
            <label style={styles.toggleLabel}>
              <span>Email Notifications</span>
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                style={styles.checkbox}
              />
            </label>
            <label style={styles.toggleLabel}>
              <span>Push Notifications</span>
              <input
                type="checkbox"
                checked={preferences.push_notifications}
                onChange={(e) => handlePreferenceChange('push_notifications', e.target.checked)}
                style={styles.checkbox}
              />
            </label>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <Shield size={20} color="#94a3b8" />
            <h2 style={styles.cardTitle}>Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <button type="submit" style={styles.saveButton}>
              Change Password
            </button>
          </form>
        </motion.div>

        {/* Mechanic Section (if applicable) */}
        {mechanic && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={styles.card}
          >
            <div style={styles.cardHeader}>
              <CreditCard size={20} color="#94a3b8" />
              <h2 style={styles.cardTitle}>Mechanic Account</h2>
            </div>
            <div style={styles.detailRow}>
              <span>Business Name</span>
              <span style={styles.detailValue}>{mechanic.business_name}</span>
            </div>
            <div style={styles.detailRow}>
              <span>Subscription Status</span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor:
                    mechanic.subscription_status === 'active'
                      ? '#22c55e20'
                      : '#ef444420',
                  color:
                    mechanic.subscription_status === 'active'
                      ? '#22c55e'
                      : '#ef4444',
                }}
              >
                {mechanic.subscription_status}
              </span>
            </div>
            {mechanic.stripe_account_id && (
              <div style={styles.detailRow}>
                <span>Stripe Dashboard</span>
                <a
                  href={`https://connect.stripe.com/express/${mechanic.stripe_account_id}/dashboard`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.stripeLink}
                >
                  Manage Account <ExternalLink size={14} />
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* Danger Zone */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ ...styles.card, borderColor: '#ef4444' }}
        >
          <div style={styles.cardHeader}>
            <Trash2 size={20} color="#ef4444" />
            <h2 style={{ ...styles.cardTitle, color: '#ef4444' }}>Danger Zone</h2>
          </div>
          <div style={styles.dangerActions}>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={16} />
              Sign Out
            </button>
            <button onClick={handleDeleteAccount} style={styles.deleteButton}>
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </motion.div>
      </div>

      {/* Success/Error Messages */}
      {error && <div style={styles.errorBox}>{error}</div>}
      {success && <div style={styles.successBox}>{success}</div>}

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
    color: '#94a3b8',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#94a3b8',
    margin: 0,
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px',
    color: '#f1f5f9',
    fontSize: '14px',
  },
  saveButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    width: '100%',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  note: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px',
    textAlign: 'center',
  },
  toggleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toggleLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#94a3b8',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #1e293b',
  },
  detailValue: {
    color: '#f1f5f9',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  stripeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#22c55e',
    textDecoration: 'none',
  },
  dangerActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  logoutButton: {
    flex: 1,
    background: '#334155',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  deleteButton: {
    flex: 1,
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  errorBox: {
    marginTop: '24px',
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  successBox: {
    marginTop: '24px',
    padding: '12px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    color: '#22c55e',
  },
}