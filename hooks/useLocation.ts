'use client'

import { useState, useCallback } from 'react'

interface Location {
  lat: number
  lng: number
  accuracy?: number
}

interface LocationState {
  location: Location | null
  loading: boolean
  error: string | null
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
  })

  const getLocation = useCallback(async (options?: PositionOptions) => {
    if (!navigator.geolocation) {
      setState({ location: null, loading: false, error: 'Geolocation not supported' })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
            loading: false,
            error: null,
          })
          resolve()
        },
        (error) => {
          setState({ location: null, loading: false, error: error.message })
          resolve()
        },
        options
      )
    })
  }, [])

  return { ...state, getLocation }
}
