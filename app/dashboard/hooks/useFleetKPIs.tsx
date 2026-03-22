import { useState, useEffect } from 'react'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

export interface FleetKPIs {
  totalVehicles: number
  healthy: number
  warning: number
  critical: number
}

export function useFleetKPIs(vehicles: Vehicle[]): FleetKPIs {
  const [kpis, setKpis] = useState<FleetKPIs>({
    totalVehicles: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
  })

  useEffect(() => {
    const enriched = computeFleetBrain(vehicles)
    const healthy = enriched.filter(v => (v.health_score ?? 100) >= 70).length
    const warning = enriched.filter(v => {
      const s = v.health_score ?? 100
      return s >= 40 && s < 70
    }).length
    const critical = enriched.filter(v => (v.health_score ?? 100) < 40).length
    setKpis({ totalVehicles: vehicles.length, healthy, warning, critical })
  }, [vehicles])

  return kpis
}