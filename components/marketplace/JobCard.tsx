'use client'

import { motion } from 'framer-motion'
import { MapPin, Calendar, DollarSign } from 'lucide-react'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface JobCardProps {
  id: string
  title: string
  description?: string
  budget?: number
  location?: string
  status: string
  createdAt: string
  vehicle?: { make: string; model: string; license_plate: string }
  onClick?: () => void
}

export default function JobCard({
  title,
  description,
  budget,
  location,
  status,
  createdAt,
  vehicle,
  onClick,
}: JobCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      style={styles.card}
      onClick={onClick}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <span style={{ ...styles.statusBadge, ...getStatusStyle(status) }}>
          {status}
        </span>
      </div>
      {description && <p style={styles.description}>{description}</p>}
      <div style={styles.details}>
        {budget && (
          <span style={styles.detail}>
            <DollarSign size={14} color="#64748b" />
            £{budget}
          </span>
        )}
        {location && (
          <span style={styles.detail}>
            <MapPin size={14} color="#64748b" />
            {location}
          </span>
        )}
        <span style={styles.detail}>
          <Calendar size={14} color="#64748b" />
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>
      {vehicle && (
        <div style={styles.vehicle}>
          {vehicle.make} {vehicle.model} – {vehicle.license_plate}
        </div>
      )}
    </motion.div>
  )
}

const getStatusStyle = (status: string) => ({
  background:
    status === 'open' ? '#22c55e20' :
    status === 'assigned' ? '#3b82f620' :
    status === 'completed' ? '#64748b20' : '#ef444420',
  color:
    status === 'open' ? '#22c55e' :
    status === 'assigned' ? '#3b82f6' :
    status === 'completed' ? '#64748b' : '#ef4444',
})

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '12px',
  },
  details: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  detail: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  vehicle: {
    fontSize: '13px',
    color: '#64748b',
    borderTop: '1px solid #1e293b',
    marginTop: '8px',
    paddingTop: '8px',
  },
}