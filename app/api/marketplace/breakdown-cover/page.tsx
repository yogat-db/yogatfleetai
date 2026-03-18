'use client'

import { motion } from 'framer-motion'

export default function BreakdownCoverPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Breakdown Cover</h1>
      <p style={styles.subtitle}>Coming soon – compare roadside assistance plans.</p>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: '32px', fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px' },
  subtitle: { color: '#94a3b8', fontSize: '16px' },
}