"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { ServiceEvent } from "@/types/fleet"

export function useServiceEvents(vehicleId: string | undefined) {
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchEvents(id: string) {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("service_events")
      .select("*")
      .eq("vehicle_id", id)
      .order("occurred_at", { ascending: false })

    if (error) {
      setError(error.message)
      setEvents([])
      setLoading(false)
      return
    }

    setEvents((data || []) as ServiceEvent[])
    setLoading(false)
  }

  useEffect(() => {
    if (!vehicleId) return
    fetchEvents(vehicleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId])

  // Optimistic add
  async function addEvent(payload: Omit<ServiceEvent, "id">) {
    const tempId = `temp_${Math.random().toString(16).slice(2)}`
    const optimistic: ServiceEvent = { ...(payload as any), id: tempId }

    setEvents(prev => [optimistic, ...prev])

    const { data, error } = await supabase
      .from("service_events")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      setEvents(prev => prev.filter(e => e.id !== tempId))
      setError(error.message)
      return
    }

    setEvents(prev => prev.map(e => (e.id === tempId ? (data as any) : e)))
  }

  return { events, loading, error, refetch: () => vehicleId && fetchEvents(vehicleId), addEvent }
}