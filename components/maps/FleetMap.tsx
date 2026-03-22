'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
// Fix for default marker icons in Next.js
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Helper to get marker color based on health score
const getMarkerColor = (healthScore?: number | null) => {
  if (healthScore == null) return '#94a3b8' // grey
  if (healthScore >= 70) return '#22c55e' // green
  if (healthScore >= 40) return '#f59e0b' // orange
  return '#ef4444' // red
}

interface VehicleMarker {
  id: string
  position: [number, number]
  license_plate: string
  make?: string | null
  model?: string | null

  health_score?: number | null
  onClick?: () => void
}

interface FleetMapProps {
  vehicles: VehicleMarker[]
  center?: [number, number]
  zoom?: number
}

// Custom marker icon generator
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    popupAnchor: [0, -12],
  })
}

// Component to adjust map bounds when vehicles change
function MapBounds({ vehicles }: { vehicles: VehicleMarker[] }) {
  const map = useMap()

  
  useEffect(() => {
    if (vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map(v => v.position))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [vehicles, map])
 
  return null
}

export default function FleetMap({ vehicles, center = [51.505, -0.09], zoom = 13 }: FleetMapProps) {
  // Fix leaflet icons on mount
  useEffect(() => {
    fixLeafletIcon()
  }, [])

  // Filter out vehicles with invalid coordinates
  const validVehicles = vehicles.filter(
    v => v.position && Array.isArray(v.position) && v.position.length === 2 &&
         !isNaN(v.position[0]) && !isNaN(v.position[1])
  )

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validVehicles.length > 0 && (
        <>
          <MapBounds vehicles={validVehicles} />
          <MarkerClusterGroup chunkedLoading>
            {validVehicles.map((vehicle) => {
              const color = getMarkerColor(vehicle.health_score) // ✅ corrected usage
              return (
                <Marker
                  key={vehicle.id}
                  position={vehicle.position}
                  icon={createMarkerIcon(color)}
                  eventHandlers={{
                    click: () => vehicle.onClick?.(),
                  }}
                >
                  <Popup>
                    <div style={styles.popup}>
                      <strong>{vehicle.license_plate}</strong>
                      <div>{vehicle.make} {vehicle.model}</div>
                      {vehicle.health_score != null && (
                        <div style={{ color: getMarkerColor(vehicle.health_score) }}>
                          Health: {vehicle.health_score}%
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MarkerClusterGroup>
        </>
      )}
    </MapContainer>
  )
}

const styles = {
  popup: {
    minWidth: '150px',
    padding: '4px',
  },
}
