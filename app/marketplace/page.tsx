'use client'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const categories = [
  {
    title: 'Repair Jobs',
    description: 'Post a repair job or find work',
    icon: '🔧',
    href: '/marketplace/jobs',
    color: '#22c55e',
  },
  {
    title: 'Mechanics Directory',
    description: 'Find trusted mechanics near you',
    icon: '🔩',
    href: '/marketplace/mechanics',
    color: '#3b82f6',
  },
  {
    title: 'Breakdown Cover',
    description: 'Compare roadside assistance plans',
    icon: '🚛',
    href: '/marketplace/breakdown-cover',
    color: '#f59e0b',
  },
]

export default function MarketplacePage() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Marketplace</h1>
      <p style={styles.subtitle}>
        Everything you need to keep your vehicle on the road
      </p>

      <div style={styles.grid}>
        {categories.map((cat, i) => (
          <motion.div
            key={cat.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            style={{ ...styles.card, borderTopColor: cat.color }}
            onClick={() => router.push(cat.href)}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>{cat.icon}</div>
            <h2 style={styles.cardTitle}>{cat.title}</h2>
            <p style={styles.cardDesc}>{cat.description}</p>
          </motion.div>
        ))}
      </div>
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
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #1e293b',
    borderTop: '4px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: '14px',
  },
}