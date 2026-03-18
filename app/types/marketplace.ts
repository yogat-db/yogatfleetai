import type { Vehicle } from './fleet'
import type { User } from '@supabase/supabase-js'

export interface Mechanic {
  id: string
  user_id: string
  business_name: string
  phone: string | null
  address: string | null
  lat: number | null
  lng: number | null
  service_radius: number | null
  verified: boolean
  subscription_status: 'inactive' | 'active' | 'past_due'
  stripe_account_id: string | null
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  vehicle_id: string | null
  title: string
  description: string | null
  dtc_codes: string[] | null
  complexity: 'DIY' | 'mechanic' | null
  status: 'open' | 'assigned' | 'completed' | 'cancelled'
  location: string | null
  lat: number | null
  lng: number | null
  budget: number | null
  created_at: string
  vehicle?: Vehicle
  user?: User
}

export interface Application {
  id: string
  job_id: string
  mechanic_id: string
  bid_amount: number | null
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  created_at: string
  mechanic?: Mechanic
  job?: Job
}

export interface Job {
  id: string
  user_id: string
  vehicle_id: string | null
  title: string
  description: string | null
  dtc_codes: string[] | null
  complexity: 'DIY' | 'mechanic' | null
  status: 'open' | 'assigned' | 'completed' | 'cancelled'
  location: string | null
  lat: number | null
  lng: number | null
  budget: number | null
  assigned_mechanic_id: string | null   // <-- add this
  created_at: string
  vehicle?: Vehicle
  user?: User
}