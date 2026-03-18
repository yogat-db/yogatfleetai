'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'

// Manual fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

interface Vehicle {
  id: string
  license_plate: string
  make?: string | null
  model?: string | null
  lat?: number | null
  lng?: number | null
  health_score?: number | null
}

interface FleetMapProps {
  vehicles: Vehicle[]
}

// Component to fit bounds when vehicles change
function FitBounds({ vehicles }: { vehicles: Vehicle[] }) {
  const map = useMap()
  const initialized = useRef(false)

  useEffect(() => {
    if (vehicles.length === 0) return

    const validCoords = vehicles.filter(v => v.lat && v.lng) as (Vehicle & { lat: number; lng: number })[]
    if (validCoords.length === 0) return

    const bounds = L.latLngBounds(validCoords.map(v => [v.lat, v.lng]))
    map.fitBounds(bounds, { padding: [50, 50] })
    initialized.current = true
  }, [vehicles, map])

  return null
}

export default function FleetMap({ vehicles }: FleetMapProps) {
  // Filter vehicles with valid coordinates
  const validVehicles = vehicles.filter((v): v is Vehicle & { lat: number; lng: number } =>
    v.lat != null && v.lng != null && !isNaN(v.lat) && !isNaN(v.lng)
  )

  // Default center (Leicester, UK)
  const defaultCenter: [number, number] = [52.6369, -1.1398]

  if (validVehicles.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#94a3b8' }}>
        No location data available
      </div>
    )
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      style={{ height: '100%', width: '100%', background: '#1e293b' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MarkerClusterGroup chunkedLoading>
        {validVehicles.map((vehicle) => {
          const score = vehicle.health_score ?? 100
          let color = '#22c55e'
          if (score < 40) color = '#ef4444'
          else if (score < 70) color = '#f59e0b'

          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
          })

          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <strong>{vehicle.license_plate}</strong><br />
                  {vehicle.make} {vehicle.model}<br />
                  Health: <span style={{ color, fontWeight: 'bold' }}>{score}%</span>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>

      <FitBounds vehicles={validVehicles} />
    </MapContainer>
  )
}