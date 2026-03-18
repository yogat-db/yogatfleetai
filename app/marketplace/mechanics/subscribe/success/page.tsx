'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

export default function SubscribeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Redirect to mechanic dashboard after a short delay
    const timer = setTimeout(() => {
      router.push('/marketplace/mechanics/dashboard')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>✓ Subscription Successful!</h1>
        <p>Thank you for subscribing. You now have access to job leads.</p>
        <p>Redirecting to your dashboard...</p>
      </div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#0f172a', padding: 40, borderRadius: 16, border: '1px solid #1e293b', textAlign: 'center' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 16 },
}