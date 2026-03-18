'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface MechanicMarkerProps {
  id: string
  position: [number, number]
  businessName: string
  address: string
  phone?: string
  rating?: number
  verified?: boolean
  onClick?: () => void
}

// Fix for default marker icons in Leaflet with Next.js
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

export default function MechanicMarker({
  id,
  position,
  businessName,
  address,
  phone,
  rating,
  verified,
  onClick,
}: MechanicMarkerProps) {
  const map = useMap()

  useEffect(() => {
    fixLeafletIcon()
  }, [])

  // Custom marker icon (you can replace with your own)
  const customIcon = new L.Icon({
    iconUrl: verified
      ? 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png' // replace with verified icon
      : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  })

  return (
    <Marker
      key={id}
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick()
          map.setView(position, 15, { animate: true })
        },
      }}
    >
      <Popup>
        <div style={styles.popup}>
          <h3 style={styles.popupTitle}>{businessName}</h3>
          {verified && <span style={styles.verifiedBadge}>✓ Verified</span>}
          <p style={styles.popupAddress}>{address}</p>
          {phone && (
            <p style={styles.popupPhone}>
              📞 <a href={`tel:${phone}`} style={styles.popupLink}>{phone}</a>
            </p>
          )}
          {rating && (
            <p style={styles.popupRating}>⭐ {rating.toFixed(1)}</p>
          )}
          <button
            onClick={onClick}
            style={styles.popupButton}
          >
            View Profile
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

const styles: Record<string, React.CSSProperties> = {
  popup: {
    minWidth: '200px',
    padding: '8px',
  },
  popupTitle: {
    margin: '0 0 4px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
  },
  verifiedBadge: {
    display: 'inline-block',
    background: '#22c55e',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '12px',
    marginBottom: '6px',
  },
  popupAddress: {
    margin: '4px 0',
    fontSize: '12px',
    color: '#334155',
  },
  popupPhone: {
    margin: '4px 0',
    fontSize: '12px',
  },
  popupLink: {
    color: '#22c55e',
    textDecoration: 'none',
  },
  popupRating: {
    margin: '4px 0',
    fontSize: '12px',
    color: '#f59e0b',
  },
  popupButton: {
    marginTop: '8px',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    width: '100%',
    cursor: 'pointer',
    fontWeight: 600,
  },
}