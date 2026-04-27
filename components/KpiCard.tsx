'use client'

import { motion } from 'framer-motion'
import theme from '@/app/theme'

interface KpiCardProps {
  label: string
  value: number | string
  color?: string // Optional override, defaults to theme primary
  icon?: React.ReactNode
}

/**
 * SPECTACULAR KPI CARD
 * Features:
 * 1. Spring-loaded physics for "bouncy" interactions.
 * 2. Glassmorphism-lite background using theme colors.
 * 3. Intelligent color blending for glow effects.
 */
export default function KpiCard({ 
  label, 
  value, 
  color = theme.colors.primary || '#22c55e', 
  icon 
}: KpiCardProps) {
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        boxShadow: `0 20px 30px -10px ${color}33`, // 20% opacity glow
        borderColor: color
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        ...styles.card,
        borderBottom: `4px solid ${color}`,
      }}
    >
      <div style={styles.header}>
        {icon && (
          <div style={{ ...styles.iconWrapper, backgroundColor: `${color}15`, color }}>
            {icon}
          </div>
        )}
        <div style={styles.label}>{label}</div>
      </div>

      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        style={{ ...styles.value, color }}
      >
        {value}
      </motion.div>

      {/* Decorative background glow */}
      <div style={{ ...styles.glow, background: `radial-gradient(circle at top right, ${color}10, transparent)` }} />
    </motion.div>
  )
}

const styles = {
  card: {
    position: 'relative' as const,
    background: theme.colors.background.card || '#0f172a',
    padding: '24px',
    borderRadius: '20px',
    border: `1px solid ${theme.colors.border.light || '#1e293b'}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    minHeight: '140px',
    cursor: 'default',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  iconWrapper: {
    padding: '8px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: theme.colors.text.secondary || '#94a3b8',
  },
  value: {
    fontSize: '32px',
    fontWeight: 800,
    fontFamily: theme.fontFamilies.sans || 'Inter, sans-serif',
    letterSpacing: '-0.02em',
  },
  glow: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none' as const,
  }
}