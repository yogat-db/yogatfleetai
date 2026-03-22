import { motion } from 'framer-motion'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface KpiCardProps {
  label: string
  value: number | string
  color?: string
  icon?: React.ReactNode
}

export default function KpiCard({ label, value, color = '#60a5fa', icon }: KpiCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: `0 10px 20px -5px ${color}40` }}
      style={{ ...styles.card, borderBottom: `3px solid ${color}` }}
    >
      {icon && <div style={{ marginBottom: 8 }}>{icon}</div>}
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color }}>{value}</div>
    </motion.div>
  )
}

const styles = {
  card: { background: '#0f172a', padding: 20, borderRadius: 16, border: '1px solid #1e293b', transition: 'all 0.2s' },
  label: { fontSize: 14, textTransform: 'uppercase', opacity: 0.7 },
  value: { fontSize: 36, fontWeight: 700, marginTop: 8 },
} as const