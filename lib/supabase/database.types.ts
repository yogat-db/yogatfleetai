export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 1. Move Enums to the top so they are available to the Interface
export type JobStatus = "open" | "active" | "completed" | "cancelled"
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn"

export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          bid_amount: number | null
          created_at: string
          id: string
          job_id: string
          mechanic_id: string
          message: string | null
          status: ApplicationStatus
        }
        Insert: {
          bid_amount?: number | null
          created_at?: string
          id?: string
          job_id: string
          mechanic_id: string
          message?: string | null
          status?: ApplicationStatus
        }
        Update: {
          bid_amount?: number | null
          job_id?: string
          mechanic_id?: string
          message?: string | null
          status?: ApplicationStatus
        }
        Relationships: [
          { foreignKeyName: "applications_job_id_fkey", columns: ["job_id"], referencedRelation: "jobs", referencedColumns: ["id"] },
          { foreignKeyName: "applications_mechanic_id_fkey", columns: ["mechanic_id"], referencedRelation: "mechanics", referencedColumns: ["id"] }
        ]
      }
      diagnostic_scans: {
        Row: {
          codes: string[] | null
          created_at: string
          id: string
          scanned_at: string
          user_id: string
          vehicle_id: string | null
          ai_summary: string | null
          severity: "low" | "medium" | "high" | "critical" | null
        }
        Insert: {
          codes?: string[] | null
          user_id: string
          vehicle_id?: string | null
          ai_summary?: string | null
          severity?: "low" | "medium" | "high" | "critical" | null
        }
        Update: {
          ai_summary?: string | null
          severity?: "low" | "medium" | "high" | "critical" | null
        }
        Relationships: [
          { foreignKeyName: "diagnostic_scans_vehicle_id_fkey", columns: ["vehicle_id"], referencedRelation: "vehicles", referencedColumns: ["id"] }
        ]
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          complexity: "simple" | "intermediate" | "advanced" | null
          created_at: string
          description: string
          dtc_codes: string[] | null
          id: string
          lat: number
          lng: number
          location: string | null
          status: JobStatus
          title: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          complexity?: "simple" | "intermediate" | "advanced" | null
          description: string
          dtc_codes?: string[] | null
          lat: number
          lng: number
          status?: JobStatus
          title: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          status?: JobStatus
          budget_max?: number | null
          budget_min?: number | null
        }
        Relationships: [
          { foreignKeyName: "jobs_vehicle_id_fkey", columns: ["vehicle_id"], referencedRelation: "vehicles", referencedColumns: ["id"] }
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          health_score: number | null
          id: string
          image_url: string | null
          license_plate: string
          make: string | null
          model: string | null
          year: number | null
          mileage: number | null
          user_id: string
          last_scanned_at: string | null
          // FIX: Added missing geospatial columns for the Map
          lat: number | null
          lng: number | null
        }
        Insert: {
          license_plate: string
          user_id: string
          health_score?: number | null
          make?: string | null
          model?: string | null
          year?: number | null
          mileage?: number | null
          lat?: number | null
          lng?: number | null
        }
        Update: {
          health_score?: number | null
          mileage?: number | null
          last_scanned_at?: string | null
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_nearby_jobs: {
        Args: { x_lat: number; x_lng: number; radius_km: number }
        Returns: { id: string; title: string; distance: number }[]
      }
    }
    Enums: {
      job_status: JobStatus
      application_status: ApplicationStatus
    }
  }
}

// ---------------------------------------------------------
// Helper Exports
// ---------------------------------------------------------

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// JOIN Types
export type JobWithVehicle = TableRow<'jobs'> & { vehicles: TableRow<'vehicles'> | null }
export type ScanWithVehicle = TableRow<'diagnostic_scans'> & { vehicles: TableRow<'vehicles'> | null }