'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client';
import type { Vehicle } from '@/app/types/fleet'

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setVehicles(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchVehicles()
  }, [])
  return { vehicles, loading, error }
}