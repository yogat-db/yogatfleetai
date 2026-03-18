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

  // Data URL fallback – no external file needed
  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'600\' height=\'400\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' strokeWidth=\'1\' strokeLinecap=\'round\' strokeLinejoin=\'round\'%3E%3Crect x=\'2\' y=\'6\' width=\'20\' height=\'12\' rx=\'2\'/%3E%3Ccircle cx=\'7\' cy=\'16\' r=\'2\'/%3E%3Ccircle cx=\'17\' cy=\'16\' r=\'2\'/%3E%3Cpath d=\'M9 10h6\'/%3E%3C/svg%3E'

  const imageUrl = !imgError && vehicle.image_url ? vehicle.image_url : fallbackImage

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg"
      onClick={() => {
        setExpanded(!expanded)
        onClick?.()
      }}
    >
      <div style={{ position: 'relative', height: '180px', width: '100%', background: '#1e293b' }}>
        <Image
          src={imageUrl}
          alt={`${vehicle.make || 'Unknown'} ${vehicle.model || ''}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
          onError={() => setImgError(true)}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: getHealthColor()
          }}>
            {healthScore}%
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              style={{
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
                cursor: 'pointer'
              }}
              title="Delete vehicle"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white">
          {vehicle.make || 'Unknown'} {vehicle.model || ''}
        </h3>
        <p className="text-sm text-gray-400">{vehicle.license_plate || 'No plate'}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">Year: {vehicle.year || '—'}</span>
          <span className="text-xs text-gray-500">
            Mileage: {vehicle.mileage?.toLocaleString() ?? '—'} mi
          </span>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-800"
            >
              <p className="text-sm text-gray-300">
                <span className="font-medium text-gray-400">Status:</span>{' '}
                {vehicle.status || 'Active'}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                <span className="font-medium text-gray-400">Health Score:</span>{' '}
                <span style={{ color: getHealthColor() }}>{healthScore}%</span>
              </p>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 mt-3">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
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
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
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