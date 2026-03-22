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
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

const getMarkerColor = (health?: number) => {
  if (health == null) return '#94a3b8'
  if (health >= 70) return '#22c55e'
  if (health >= 40) return '#f59e0b'
  return '#ef4444'
}

const createMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color}; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  popupAnchor: [0, -12],
})

function MapBounds({ vehicles }: { vehicles: any[] }) {
  const map = useMap()
  useEffect(() => {
    if (vehicles.length) {
      const bounds = L.latLngBounds(vehicles.map(v => v.position))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [vehicles])
  return null
}

export default function FleetMap({ vehicles }: { vehicles: any[] }) {
  useEffect(() => { fixLeafletIcon() }, [])
  const validVehicles = vehicles.filter(v => v.position?.length === 2 && !isNaN(v.position[0]))

  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {validVehicles.length > 0 && (
        <>
          <MapBounds vehicles={validVehicles} />
          <MarkerClusterGroup>
            {validVehicles.map(v => (
              <Marker
                key={v.id}
                position={v.position}
                icon={createMarkerIcon(getMarkerColor(v.health_score))}
              >
                <Popup>
                  <strong>{v.license_plate}</strong><br />
                  {v.make} {v.model}<br />
                  Health: {v.health_score ?? 'N/A'}%
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </>
      )}
    </MapContainer>
  )
}