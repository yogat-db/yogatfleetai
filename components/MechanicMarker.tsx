'use client'

import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface MechanicMarkerProps {
  id: string
  position: [number, number]
  businessName: string
  phone?: string
  verified?: boolean
}

const icon = L.divIcon({
  className: 'mechanic-marker',
  html: `<div style="background:#3b82f6; width:24px; height:24px; border-radius:50%; border:3px solid white;"></div>`,
  iconSize: [24, 24],
})

export default function MechanicMarker({ id, position, businessName, phone, verified }: MechanicMarkerProps) {
  return (
    <Marker key={id} position={position} icon={icon}>
      <Popup>
        <strong>{businessName}</strong>
        {verified && <span style={{ color: '#22c55e', display: 'block' }}>✓ Verified</span>}
        {phone && <span>📞 {phone}</span>}
      </Popup>
    </Marker>
  )
}
