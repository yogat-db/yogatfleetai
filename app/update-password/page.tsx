'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        setError('Invalid or expired reset link. Please request a new one.')
        setTimeout(() => router.push('/forgot-password'), 3000)
      }
      setSessionChecked(true)
    }
    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionChecked) {
      setError('Please wait while we verify your session.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Double-check session before updating
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session. Please request a new reset link.')
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Sign out to clear the session and avoid middleware redirect loops
      await supabase.auth.signOut()

      setSuccess(true)
      // Use a reliable redirect after a short delay
      setTimeout(() => {
        // Fallback in case router.push fails
        window.location.href = '/login'
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionChecked) {
    return <div style={styles.loading}>Verifying reset link...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.card}
    >
      <h1 style={styles.title}>Update Password</h1>
      {success ? (
        <div style={styles.success}>
          <p>Password updated successfully! Redirecting to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </motion.div>
  )
}

const styles = {
  card: {
    maxWidth: '420px',
    margin: '100px auto',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '24px',
    color: '#f1f5f9',
    textAlign: 'center' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  input: {
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '16px',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  button: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  success: {
    textAlign: 'center' as const,
    color: '#22c55e',
    padding: '20px 0',
  },
  loading: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    marginTop: '100px',
  },
} as const