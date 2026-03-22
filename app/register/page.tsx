'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
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
      <h1 style={styles.title}>Create Account</h1>
      {success ? (
        <div style={styles.success}>
          <p>Registration successful! Please check your email to confirm your account.</p>
          <p>Redirecting to login...</p>
        </div>
      ) : (
        <form onSubmit={handleRegister} style={styles.form}>
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
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
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
            {loading ? 'Creating account...' : 'Register'}
          </button>
          <p style={styles.link}>
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </form>
      )}
    </motion.div>
  )
}

const styles = {
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '420px',
    margin: '100px auto',
  },
  title: { fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#f1f5f9', textAlign: 'center' as const },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  label: { fontSize: '14px', color: '#94a3b8' },
  input: {
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '16px',
    outline: 'none',
  },
  error: { color: '#ef4444', fontSize: '14px', textAlign: 'center' as const },
  success: { color: '#22c55e', fontSize: '14px', textAlign: 'center' as const, padding: '20px 0' },
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
  link: { textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px', a: { color: '#22c55e', textDecoration: 'none' } },
} as const