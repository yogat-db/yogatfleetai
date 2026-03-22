// app/types/fleet.ts

export interface Vehicle {
  id: string
  user_id: string
  license_plate: string
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  lat: number | null
  lng: number | null
  health_score: number | null
  status: string | null
  image_url: string | null
  mot_due?: string | null          // optional MOT expiry date
  created_at: string
}

export interface ServiceEvent {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  image_url: string | null
  created_at: string
  // joined fields (optional, populated by API when needed)
  vehicle?: Vehicle
}

export interface VehicleAI extends Vehicle {
  // AI‑enriched fields added by computeFleetBrain
  health_score: number            // overrides nullable with computed value
  risk: 'low' | 'medium' | 'high'
  predictedFailureDate: string | null
  daysToFailure: number | null
  estimatedRepairCost: number | null
}

export interface DiagnosticScan {
  id: string
  vehicle_id: string
  codes: string[]                  // array of DTC codes
  created_at: string
}

export interface MaintenanceItem {
  task: string
  lastPerformedAt: string | null
  lastMileage: number | null
  nextDueMileage: number | null
  nextDueDate: string | null
  overdue: boolean
}

export interface MaintenanceSchedule {
  vehicleId: string
  license_plate: string
  currentMileage: number
  age: number
  schedule: MaintenanceItem[]
}

export interface BreakdownPrediction {
  vehicleId: string
  license_plate: string
  breakdownProbability: number      // 0‑1
  reasons: string[]
  imminent: boolean                  // probability > threshold
}