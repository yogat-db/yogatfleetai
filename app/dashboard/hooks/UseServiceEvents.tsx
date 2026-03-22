'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ServiceEvent = {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  created_at: string
}

export function useServiceEvents(vehicleId?: string) {
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        let query = supabase.from('service_events').select('*')
        if (vehicleId) query = query.eq('vehicle_id', vehicleId)
        query = query.order('occurred_at', { ascending: false })
        const { data, error } = await query
        if (error) throw error
        setEvents(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [vehicleId])
  return { events, loading, error }
}