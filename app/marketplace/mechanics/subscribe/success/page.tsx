'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (sessionId) {
      // Optionally verify the session with your backend
      console.log('Subscription successful:', sessionId)
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    const redirect = setTimeout(() => {
      router.push('/marketplace/mechanics/dashboard')
    }, 5000)
    return () => {
      clearInterval(timer)
      clearTimeout(redirect)
    }
  }, [sessionId, router])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.container}
    >
      <div style={styles.card}>
        <CheckCircle size={64} color="#22c55e" />
        <h1 style={styles.title}>Subscription Successful!</h1>
        <p style={styles.message}>
          Thank you for subscribing. Your mechanic account is now active.
        </p>
        <p style={styles.redirect}>
          Redirecting to your dashboard in {countdown} seconds...
        </p>
        <button
          onClick={() => router.push('/marketplace/mechanics/dashboard')}
          style={styles.button}
        >
          Go to Dashboard Now
        </button>
      </div>
    </motion.div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
    padding: '20px',
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '480px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginTop: '20px',
    marginBottom: '12px',
    color: '#f1f5f9',
  },
  message: {
    color: '#94a3b8',
    fontSize: '16px',
    marginBottom: '20px',
  },
  redirect: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '24px',
  },
  button: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}