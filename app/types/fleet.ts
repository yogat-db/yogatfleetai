/**
 * FLEET DOMAIN TYPES
 * Optimized for Next.js 16 + Supabase
 */

// --- Shared Constants & Enums ---

export type VehicleStatus = 'active' | 'in_service' | 'parked' | 'decommissioned';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FuelType = 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid' | 'LPG';

// --- Core Entities ---

export interface Vehicle {
  id: string
  user_id: string
  license_plate: string
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  fuel_type?: FuelType | null     // Added for that "Fuel Fix" we discussed
  lat: number | null
  lng: number | null
  health_score: number | null
  status: VehicleStatus | null    // Strict types catch UI bugs early
  image_url: string | null
  mot_due?: string | null          
  created_at: string
  updated_at?: string             // Track changes for sync
}

export interface ServiceEvent {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  cost?: number | null            // Added for financial tracking
  occurred_at: string
  image_url: string | null
  created_at: string
  vehicle?: Vehicle               // Useful for joined queries
}

// --- AI & Logic Extensions ---

export interface VehicleAI extends Omit<Vehicle, 'health_score'> {
  // AI-enriched fields added by computeFleetBrain
  health_score: number            
  risk: RiskLevel
  predicted_failure_date: string | null
  days_to_failure: number | null
  estimated_repair_cost: number | null
  ai_summary?: string             // Brief text summary for the card
}

// --- Diagnostics & Maintenance ---

export interface DiagnosticScan {
  id: string
  vehicle_id: string
  codes: string[]                  
  raw_data?: Record<string, any>   // Support for full OBD-II JSON dump
  is_resolved: boolean             // Track if mechanic cleared the codes
  created_at: string
}

export interface MaintenanceItem {
  task: string
  type: 'preventative' | 'corrective' | 'statutory' // (e.g. Oil vs Repair vs MOT)
  last_performed_at: string | null
  last_mileage: number | null
  next_due_mileage: number | null
  next_due_date: string | null
  overdue: boolean
  priority: number                // 0 (Low) to 3 (Immediate)
}

export interface MaintenanceSchedule {
  vehicle_id: string
  license_plate: string
  current_mileage: number
  age_in_years: number
  items: MaintenanceItem[]
}

// --- Predictive Analytics ---

export interface BreakdownPrediction {
  vehicle_id: string
  license_plate: string
  probability: number              // 0.0 to 1.0
  reasons: string[]
  imminent: boolean                  
  suggested_action: string         // e.g. "Replace battery within 48h"
}

// --- API Response Helpers ---

export interface FleetSummary {
  total_vehicles: number
  average_health: number
  critical_count: number
  upcoming_service_count: number
}