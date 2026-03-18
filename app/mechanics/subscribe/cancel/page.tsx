'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { XCircle } from 'lucide-react'

export default function SubscribeCancelPage() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={styles.container}
    >
      <XCircle size={64} color="#ef4444" />
      <h1 style={styles.title}>Payment Cancelled</h1>
      <p style={styles.message}>
        Your subscription was not completed. You can try again or contact support.
      </p>
      <button onClick={() => router.push('/marketplace/mechanics/subscribe')} style={styles.button}>
        Try Again
      </button>
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
    marginBottom: '24px',
  },
  button: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}