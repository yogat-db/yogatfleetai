/**
 * MASTER VEHICLE TYPE definition
 * Location: /app/types/vehicle.ts
 * * This file serves as the single source of truth for the Fleet system.
 * It includes safety for nullable fields to prevent UI crashes.
 */

export type VehicleStatus = 'active' | 'pending' | 'expired' | 'maintenance';

export type FuelType = 'Gas' | 'Diesel' | 'Electric' | 'Hybrid' | 'Hydrogen';

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  license_plate: string;
  
  // Optional/Nullable fields from DB
  year?: number | null;
  image_url?: string | null;
  fuel_type?: FuelType | string | null;
  
  /** * CRITICAL: health_score and mileage are nullable in DB.
   * Logic must check for null before calling methods like .toLocaleString()
   */
  health_score?: number | null;
  mileage?: number | null;

  // Metadata
  status?: VehicleStatus;
  mot_expiry_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Metadata helper for complex notifications or logs
 */
export interface VehicleLog {
  id: string;
  vehicle_id: string;
  action: string;
  notes?: string;
  created_at: string;
}