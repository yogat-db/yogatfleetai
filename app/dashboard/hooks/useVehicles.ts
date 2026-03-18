"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// or if you're using the standard supabase client:
// import { supabase } from '../../../lib/supabaseClient'

export type VehicleRow = {
  id: string
  org_id: string
  plate: string
  make?: string | null
  model?: string | null
  year?: number | null
  mileage?: number | null
  status?: "active" | "in_service" | "inactive" | string | null
  created_at?: string
}

export type VehicleCreateInput = {
  plate: string
  make?: string
  model?: string
  year?: number
  mileage?: number
  status?: "active" | "in_service" | "inactive"
}

function normPlate(p: string) {
  return p?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

export function useVehicles(orgId?: string) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from("vehicles").select("*")
      
      if (orgId) {
        query = query.eq("org_id", orgId)
      }
      
      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  return {
    vehicles,
    loading,
    error,
    refetch: fetchVehicles
  }
}