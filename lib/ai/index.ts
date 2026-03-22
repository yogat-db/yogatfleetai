import type { Vehicle } from '@/app/types/fleet'

export interface VehicleAI extends Vehicle {
  health_score: number
  risk: 'low' | 'medium' | 'high'
  predictedFailureDate: string | null
  daysToFailure: number | null
  estimatedRepairCost: number | null
}

// Helper functions
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function yearsOld(year?: number | string | null): number {
  if (year == null) return 6
  const y = typeof year === 'string' ? parseInt(year, 10) : year
  return isNaN(y) ? 6 : new Date().getFullYear() - y
}

function calculateHealthScore(vehicle: Vehicle): number {
  let score = 100
  const age = yearsOld(vehicle.year)
  score -= Math.min(age * 2, 30)
  if (vehicle.mileage) {
    const mileagePenalty = Math.floor(vehicle.mileage / 5000)
    score -= Math.min(mileagePenalty, 40)
  }
  if (vehicle.status === 'inactive') score -= 20
  else if (vehicle.status === 'warning') score -= 10
  return clamp(score, 0, 100)
}

function determineRisk(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'low'
  if (score >= 40) return 'medium'
  return 'high'
}

function estimateFailureDate(risk: 'low' | 'medium' | 'high'): string | null {
  if (risk === 'low') return null
  const days = risk === 'medium' ? 90 : 30
  return new Date(Date.now() + days * 86400000).toISOString()
}

function estimateRepairCost(risk: 'low' | 'medium' | 'high', vehicle: Vehicle): number | null {
  if (risk === 'low') return null
  const base = vehicle.make?.toUpperCase() === 'BMW' || vehicle.make?.toUpperCase() === 'AUDI' ? 2000 : 800
  return risk === 'high' ? base * 2 : base
}

function enrichVehicle(vehicle: Vehicle): VehicleAI {
  const health = calculateHealthScore(vehicle)
  const risk = determineRisk(health)
  const failureDate = estimateFailureDate(risk)
  const days = failureDate ? Math.ceil((new Date(failureDate).getTime() - Date.now()) / 86400000) : null
  const cost = estimateRepairCost(risk, vehicle)

  return {
    ...vehicle,
    health_score: health,
    risk,
    predictedFailureDate: failureDate,
    daysToFailure: days,
    estimatedRepairCost: cost,
  }
}

export function computeFleetBrain(vehicles: Vehicle[]): VehicleAI[] {
  return vehicles.map(vehicle => enrichVehicle(vehicle))
}

