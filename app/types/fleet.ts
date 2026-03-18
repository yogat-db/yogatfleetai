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
  image_url: string | null   // <-- add this line if missing
  created_at: string
}


export interface ServiceEvent {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  created_at: string
}


export interface VehicleAI extends Vehicle {
  health_score: number
  risk: 'low' | 'medium' | 'high'
  predictedFailureDate: string | null
  daysToFailure: number | null
  estimatedRepairCost: number | null
}