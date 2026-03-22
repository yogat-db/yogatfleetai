'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client';

export type Org = {
  id: string
  name: string
  created_at: string
}

export function useOrg() {
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('created_by', user.id)
          .single()
        if (error) throw error
        setOrg(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [])
  return { org, loading, error }
}