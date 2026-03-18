'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Mechanic {
  id: string
  business_name: string
  lat: number | null
  lng: number | null
}

interface MechanicsMapProps {
  mechanics: Mechanic[]
  userLocation?: { lat: number; lng: number } | null
  onMarkerClick?: (mechanicId: string) => void
}

export default function MechanicsMap({ mechanics, userLocation, onMarkerClick }: MechanicsMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapRef.current) return // already initialized

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([51.505, -0.09], 10)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current)

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when mechanics or userLocation change
  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer)
      }
    })

    // Add user location marker if available
    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '📍',
          iconSize: [20, 20],
        }),
      }).addTo(mapRef.current)
      userMarker.bindPopup('Your location')
    }

    // Add mechanic markers
    mechanics.forEach((m) => {
      if (m.lat && m.lng) {
        const marker = L.marker([m.lat, m.lng]).addTo(mapRef.current!)
        marker.bindPopup(`<b>${m.business_name}</b>`)
        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(m.id))
        }
      }
    })

    // Fit bounds to show all markers
    const bounds = L.latLngBounds([])
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng])
    mechanics.forEach((m) => {
      if (m.lat && m.lng) bounds.extend([m.lat, m.lng])
    })
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [mechanics, userLocation, onMarkerClick])

  return <div ref={mapContainerRef} style={{ width: '100%', height: '400px', borderRadius: '12px' }} />
}