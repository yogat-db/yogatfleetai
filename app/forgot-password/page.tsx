'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.card}
    >
      <h1 style={styles.title}>Reset Password</h1>
      {success ? (
        <div style={styles.success}>
          <p>Check your email for a password reset link.</p>
          <Link href="/login" style={styles.link}>Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.instructions}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p style={styles.backLink}>
            <Link href="/login">Back to Login</Link>
          </p>
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
    marginBottom: '16px',
    color: '#f1f5f9',
    textAlign: 'center' as const,
  },
  instructions: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '16px',
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
  backLink: {
    textAlign: 'center' as const,
    fontSize: '14px',
    a: {
      color: '#22c55e',
      textDecoration: 'none',
    },
  },
  success: {
    textAlign: 'center' as const,
    color: '#22c55e',
    padding: '20px 0',
  },
  link: {
    display: 'inline-block',
    marginTop: '16px',
    color: '#22c55e',
    textDecoration: 'none',
  },
} as const