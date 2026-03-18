'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface MapMarker {
  id: string
  position: [number, number]
  title: string
  description?: string
  icon?: L.Icon
  popupContent?: React.ReactNode
}

interface MapProps {
  markers?: MapMarker[]
  center?: [number, number]
  zoom?: number
  height?: string
  width?: string
  onMarkerClick?: (id: string) => void
}

function MapContent({ markers, onMarkerClick }: { markers?: MapMarker[]; onMarkerClick?: (id: string) => void }) {
  const map = useMap()

  useEffect(() => {
    if (markers && markers.length > 0) {
      // Fit bounds to include all markers
      const bounds = L.latLngBounds(markers.map(m => m.position))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [markers, map])

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers?.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={marker.icon}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) onMarkerClick(marker.id)
            },
          }}
        >
          {marker.popupContent && (
            <Popup>
              {marker.popupContent}
            </Popup>
          )}
        </Marker>
      ))}
      <ZoomControl position="bottomright" />
    </>
  )
}

export default function Map({
  markers = [],
  center = [51.505, -0.09], // Default: London
  zoom = 13,
  height = '400px',
  width = '100%',
  onMarkerClick,
}: MapProps) {
  useEffect(() => {
    fixLeafletIcon()
  }, [])

  return (
    <div style={{ height, width, borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // We'll add our own zoom control inside
      >
        <MapContent markers={markers} onMarkerClick={onMarkerClick} />
      </MapContainer>
    </div>
  )
}