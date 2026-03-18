'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

export default function SubscribeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Optionally verify the session with backend
    // For now, just redirect after a delay
    const timer = setTimeout(() => {
      router.push('/marketplace/mechanics/dashboard')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={styles.container}
    >
      <CheckCircle size={64} color="#22c55e" />
      <h1 style={styles.title}>Payment Successful!</h1>
      <p style={styles.message}>
        Your subscription is now active. You'll be redirected to your dashboard shortly.
      </p>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
    color: '#f1f5f9',
    padding: '20px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    marginTop: '24px',
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    color: '#94a3b8',
    maxWidth: '400px',
  },
}