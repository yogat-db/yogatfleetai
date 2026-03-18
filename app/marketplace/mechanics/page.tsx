'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

// Dynamically import map (client‑only)
const MechanicsMap = dynamic(() => import('@/components/MechanicsMap'), { ssr: false })

interface Mechanic {
  id: string
  business_name: string | null
  phone: string | null
  address: string | null
  lat: number | null
  lng: number | null
  subscription_status: string
}

export default function MechanicsPage() {
  const router = useRouter()
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchRadius, setSearchRadius] = useState(50)
  const [locationDenied, setLocationDenied] = useState(false)

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          setLocationDenied(false)
        },
        (err) => {
          console.warn('Location permission denied, showing all mechanics')
          setLocationDenied(true)
        }
      )
    } else {
      setLocationDenied(true)
    }
  }, [])

  useEffect(() => {
    fetchMechanics()
  }, [userLocation, searchRadius])

  async function fetchMechanics() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (userLocation) {
        params.append('lat', userLocation.lat.toString())
        params.append('lng', userLocation.lng.toString())
        params.append('radius', searchRadius.toString())
      }
      const res = await fetch(`/api/marketplace/mechanics?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch mechanics')
      }
      const data = await res.json()
      setMechanics(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Mechanics Directory</h1>
        <p style={styles.subtitle}>Find trusted mechanics near you</p>
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={fetchMechanics} style={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Mechanics Directory</h1>
      <p style={styles.subtitle}>Find trusted mechanics near you</p>

      {locationDenied && (
        <div style={styles.warningBanner}>
          ⚠️ Location access denied. Showing all mechanics (distance not available).
        </div>
      )}

      {userLocation && (
        <div style={styles.radiusControl}>
          <label style={styles.radiusLabel}>Search radius: {searchRadius} miles</label>
          <input
            type="range"
            min="5"
            max="100"
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseInt(e.target.value))}
            style={styles.radiusSlider}
          />
        </div>
      )}

      {mechanics.length > 0 && (userLocation || mechanics.some(m => m.lat && m.lng)) && (
        <div style={styles.mapContainer}>
          <MechanicsMap mechanics={mechanics} userLocation={userLocation} />
        </div>
      )}

      <p style={styles.resultsCount}>
        {mechanics.length} {mechanics.length === 1 ? 'mechanic' : 'mechanics'} found
      </p>

      {mechanics.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No mechanics found in your area.</p>
          {userLocation && (
            <button onClick={() => setSearchRadius(100)} style={styles.emptyButton}>
              Increase search radius
            </button>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {mechanics.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.02 }}
              style={styles.card}
            >
              <h3 style={styles.cardTitle}>{m.business_name || 'Unnamed Mechanic'}</h3>
              <p style={styles.cardText}>{m.address || 'Address not provided'}</p>
              {m.phone && <p style={styles.cardText}>📞 {m.phone}</p>}
              <div style={styles.cardFooter}>
                <span style={{
                  ...styles.badge,
                  background: m.subscription_status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                  color: m.subscription_status === 'active' ? '#22c55e' : '#94a3b8',
                }}>
                  {m.subscription_status === 'active' ? 'Verified' : 'Basic'}
                </span>
                <button
                  onClick={() => router.push(`/marketplace/mechanics/${m.id}`)}
                  style={styles.viewButton}
                >
                  View Profile
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: '32px', fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  subtitle: { color: '#94a3b8', marginBottom: '32px' },
  warningBanner: { background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#f59e0b' },
  radiusControl: { marginBottom: '24px' },
  radiusLabel: { display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' },
  radiusSlider: { width: '100%', cursor: 'pointer', accentColor: '#22c55e' },
  mapContainer: { height: '300px', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' },
  resultsCount: { fontSize: '14px', color: '#94a3b8', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '20px' },
  skeletonCard: { height: '180px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', animation: 'pulse 2s infinite' },
  card: { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' },
  cardTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  cardText: { fontSize: '14px', color: '#94a3b8', marginBottom: '4px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' },
  badge: { fontSize: '12px', padding: '4px 8px', borderRadius: '12px', fontWeight: 500 },
  viewButton: { background: '#22c55e', color: '#020617', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#64748b' },
  emptyButton: { background: '#22c55e', color: '#020617', border: 'none', borderRadius: '8px', padding: '8px 16px', marginTop: '16px', cursor: 'pointer' },
  retryButton: { marginTop: '16px', padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#020617', cursor: 'pointer' },
}