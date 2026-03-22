'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer } from 'react-leaflet'
import MechanicMarker from './MechanicMarker'
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

export default function MechanicsMap({ mechanics }: { mechanics: any[] }) {
  useEffect(() => { fixLeafletIcon() }, [])
  return (
    <MapContainer center={[52.6369, -1.1398]} zoom={10} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {mechanics.map(m => (
        <MechanicMarker
          key={m.id}
          id={m.id}
          position={[m.lat, m.lng]}
          businessName={m.business_name}
          phone={m.phone}
          verified={m.verified}
        />
      ))}
    </MapContainer>
  )
}