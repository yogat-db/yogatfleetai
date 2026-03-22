'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { Vehicle } from '@/app/types/fleet'

interface VehicleCardPremiumProps {
  vehicle?: Vehicle | null
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'600\' height=\'400\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' strokeWidth=\'1\' strokeLinecap=\'round\' strokeLinejoin=\'round\'%3E%3Crect x=\'2\' y=\'6\' width=\'20\' height=\'12\' rx=\'2\'/%3E%3Ccircle cx=\'7\' cy=\'16\' r=\'2\'/%3E%3Ccircle cx=\'17\' cy=\'16\' r=\'2\'/%3E%3Cpath d=\'M9 10h6\'/%3E%3C/svg%3E'

export default function VehicleCardPremium({
  vehicle,
  onClick,
  onEdit,
  onDelete,
}: VehicleCardPremiumProps) {
  if (!vehicle) return null

  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const healthScore = vehicle.health_score ?? 0
  const getHealthColor = () => {
    if (healthScore >= 70) return '#22c55e'
    if (healthScore >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const imageUrl = !imgError && vehicle.image_url ? vehicle.image_url : FALLBACK_IMAGE

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      style={styles.card}
      onClick={() => {
        setExpanded(!expanded)
        onClick?.()
      }}
    >
      <div style={styles.imageContainer}>
        <Image
          src={imageUrl}
          alt={`${vehicle.make || 'Unknown'} ${vehicle.model || ''}`}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 768px) 100vw, 300px"
          onError={() => setImgError(true)}
        />
        <div style={styles.badgeContainer}>
          <div style={{ ...styles.healthBadge, color: getHealthColor() }}>
            {healthScore}%
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={styles.deleteButton}
              title="Delete vehicle"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div style={styles.content}>
        <h3 style={styles.title}>
          {vehicle.make || 'Unknown'} {vehicle.model || ''}
        </h3>
        <p style={styles.plate}>{vehicle.license_plate || 'No plate'}</p>
        <div style={styles.details}>
          <span style={styles.detailText}>Year: {vehicle.year || '—'}</span>
          <span style={styles.detailText}>
            Mileage: {vehicle.mileage?.toLocaleString() ?? '—'} mi
          </span>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={styles.expandedContent}
            >
              <p style={styles.expandedText}>
                <span style={styles.label}>Status:</span> {vehicle.status || 'Active'}
              </p>
              <p style={styles.expandedText}>
                <span style={styles.label}>Health Score:</span>{' '}
                <span style={{ color: getHealthColor() }}>{healthScore}%</span>
              </p>
              {(onEdit || onDelete) && (
                <div style={styles.buttonGroup}>
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                      }}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                      style={styles.deleteButtonSmall}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
  },
  imageContainer: {
    position: 'relative',
    height: '180px',
    width: '100%',
    background: '#1e293b',
  },
  badgeContainer: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '8px',
  },
  healthBadge: {
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  deleteButton: {
    background: '#ef4444cc',
    borderRadius: '9999px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
  },
  content: {
    padding: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  plate: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 8px 0',
  },
  details: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  detailText: {
    fontSize: '12px',
    color: '#64748b',
  },
  expandedContent: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #1e293b',
  },
  expandedText: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: '0 0 4px 0',
  },
  label: {
    fontWeight: 500,
    color: '#94a3b8',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  editButton: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteButtonSmall: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
}