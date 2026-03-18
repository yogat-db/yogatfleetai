'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { Vehicle } from '@/app/types/fleet'

interface Props {
  vehicle: Vehicle
  onClick?: () => void
}

export default function VehicleCardPremium({ vehicle, onClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const healthScore = vehicle.health_score ?? 0
  const imageUrl = !imgError ? (vehicle.image_url || '/vehicles/default-car.jpg') : '/vehicles/default-car.jpg'

  const getHealthColor = () => {
    if (healthScore >= 70) return '#22c55e'
    if (healthScore >= 40) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg"
      onClick={() => { setExpanded(!expanded); onClick?.() }}
    >
      <div className="relative h-48 w-full bg-[#1e293b]">
        <Image
          src={imageUrl}
          alt={`${vehicle.make || 'Unknown'} ${vehicle.model || ''}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
          onError={() => setImgError(true)}
        />
        <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1 text-sm font-bold" style={{ color: getHealthColor() }}>
          {healthScore}%
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white">{vehicle.make || 'Unknown'} {vehicle.model || ''}</h3>
        <p className="text-sm text-gray-400">{vehicle.license_plate}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">Year: {vehicle.year || '—'}</span>
          <span className="text-xs text-gray-500">Mileage: {vehicle.mileage?.toLocaleString() ?? '—'} mi</span>
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
                <span className="font-medium text-gray-400">Status:</span> {vehicle.status || 'Active'}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                <span className="font-medium text-gray-400">Health Score:</span>{' '}
                <span style={{ color: getHealthColor() }}>{healthScore}%</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}