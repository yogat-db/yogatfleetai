'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import MechanicMarker from './MechanicMarker'
import theme from '@/app/theme'

// Standard Leaflet CSS import
import 'leaflet/dist/leaflet.css'

/**
 * FIX LEAFLET DEFAULT ICONS
 * Prevents the "missing marker" issue in Next.js builds.
 */
const fixLeafletIcon = () => {
  if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }
}

interface MechanicsMapProps {
  mechanics: Array<{
    id: string
    lat: number
    lng: number
    business_name: string
    phone?: string
    verified?: boolean
  }>
}

export default function MechanicsMap({ mechanics }: MechanicsMapProps) {
  useEffect(() => {
    fixLeafletIcon()
  }, [])

  // Optimized Tile Layer for Dark UIs
  // 'dark_all' provides a beautiful Slate/Gray map that matches Slate 950
  const tileLayerUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  return (
    <div style={styles.mapWrapper}>
      <MapContainer 
        center={[52.6369, -1.1398]} 
        zoom={12} 
        zoomControl={false} // Disable default to reposition it
        style={{ height: '100%', width: '100%', background: theme.colors.background.main }}
      >
        <TileLayer url={tileLayerUrl} attribution={attribution} />
        
        {/* Custom Zoom Control Placement */}
        <ZoomControl position="bottomright" />

        {mechanics.map((m) => (
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

      {/* --- Map Overlay UI --- */}
      <div style={styles.overlay}>
        <span style={styles.countBadge}>
          {mechanics.length} Verified Workshops Nearby
        </span>
      </div>

      <style>{`
        /* Remove the ugly white border around Leaflet focus */
        .leaflet-container { outline: 0; }
        /* Style the Zoom buttons to match theme */
        .leaflet-bar { border: none !important; box-shadow: ${theme.shadows.lg} !important; }
        .leaflet-bar a { 
          background-color: ${theme.colors.background.card} !important; 
          color: ${theme.colors.text.primary} !important; 
          border-bottom: 1px solid ${theme.colors.border.light} !important;
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  mapWrapper: {
    height: '100%',
    width: '100%',
    position: 'relative',
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: theme.shadows.md,
  },
  overlay: {
    position: 'absolute',
    top: theme.spacing[4],
    left: theme.spacing[4],
    zIndex: 1000,
    pointerEvents: 'none',
  },
  countBadge: {
    ...theme.glass,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.medium}`,
  }
}