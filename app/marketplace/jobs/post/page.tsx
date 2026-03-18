'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { getDTCInfo } from '@/lib/ai/diagnostics'

// Common job titles (same as before)
const JOB_TITLES = [
  'Oil change',
  'Brake pad replacement',
  'Engine diagnostic',
  'Tire replacement',
  'Battery replacement',
  'AC recharge',
  'Timing belt replacement',
  'Wheel alignment',
  'Transmission repair',
  'Exhaust repair',
  'Clutch replacement',
  'Head gasket repair',
  'Coolant flush',
  'Spark plug replacement',
  'Fuel injector cleaning',
  'Suspension repair',
  'Alternator replacement',
  'Starter motor replacement',
  'Radiator replacement',
  'Catalytic converter replacement',
]

export default function PostJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dtcCode = searchParams.get('dtc')
  const vehicleIdParam = searchParams.get('vehicleId')

  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [useCustomTitle, setUseCustomTitle] = useState(false)
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [location, setLocation] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch user's vehicles
  useEffect(() => {
    fetchVehicles()
  }, [])

  // Pre‑fill based on query params
  useEffect(() => {
    if (dtcCode) {
  const info = getDTCInfo(dtcCode)
  if (info) {
    // Safely get first sentence or fallback
    const shortTitle = info.description?.split('.')[0]?.trim() || 'Diagnostic issue'
    setJobTitle(shortTitle)

    // Build description safely
    const causesText = Array.isArray(info.causes) && info.causes.length
      ? `Possible causes: ${info.causes.join(', ')}`
      : ''
    setDescription(
      `DTC Code: ${dtcCode}\n\n${info.description || ''}\n\n${causesText}`.trim()
    )
  } else {
    setDescription(`DTC Code: ${dtcCode}`)
  }
}
    if (vehicleIdParam && vehicles.length > 0) {
      const match = vehicles.find(v => v.id === vehicleIdParam)
      if (match) {
        setSelectedVehicle(vehicleIdParam)
      }
    }
  }, [dtcCode, vehicleIdParam, vehicles])

  async function fetchVehicles() {
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      setVehicles(data)
      // If vehicleIdParam is provided and matches, select it after data loads
      if (vehicleIdParam && data.some((v: any) => v.id === vehicleIdParam)) {
        setSelectedVehicle(vehicleIdParam)
      }
    } catch (err) {
      console.error('Failed to fetch vehicles')
    }
  }

  const detectLocation = () => {
    setDetectingLocation(true)
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setDetectingLocation(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          setLocation(data.display_name || `${latitude}, ${longitude}`)
        } catch {
          setLocation(`${latitude}, ${longitude}`)
        }
        setDetectingLocation(false)
      },
      (err) => {
        setError('Unable to detect location: ' + err.message)
        setDetectingLocation(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const title = useCustomTitle ? customTitle : jobTitle
    if (!title.trim()) {
      setError('Job title is required')
      setLoading(false)
      return
    }

    try {
      const payload = {
        vehicle_id: selectedVehicle || null,
        title,
        description,
        budget: budget ? parseInt(budget) : null,
        location: location || null,
        lat,
        lng,
        dtc_codes: dtcCode ? [dtcCode] : [],
      }

      const res = await fetch('/api/marketplace/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post job')

      setSuccess(true)
      setTimeout(() => router.push('/marketplace/jobs'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1 style={styles.title}>Post a Repair Job</h1>

      {dtcCode && (
        <div style={styles.infoBox}>
          <strong>DTC Code detected:</strong> {dtcCode} – This will be included with your job posting.
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Vehicle Selection */}
        <div style={styles.field}>
          <label style={styles.label}>Vehicle *</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            style={styles.select}
            required
          >
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} – {v.license_plate}
              </option>
            ))}
          </select>
        </div>

        {/* Job Title with Suggestions */}
        <div style={styles.field}>
          <label style={styles.label}>Job Title *</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={!useCustomTitle}
                onChange={() => setUseCustomTitle(false)}
              /> Select from list
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={useCustomTitle}
                onChange={() => setUseCustomTitle(true)}
              /> Enter custom title
            </label>
          </div>

          {!useCustomTitle ? (
            <select
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              style={styles.select}
              required
            >
              <option value="" disabled>Choose a job type</option>
              {JOB_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Gearbox overhaul"
              style={styles.input}
              required
            />
          )}
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* Budget */}
        <div style={styles.field}>
          <label style={styles.label}>Budget (£) – optional</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 200"
            style={styles.input}
          />
        </div>

        {/* Location with detection */}
        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <div style={styles.locationRow}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your location or detect automatically"
              style={{ ...styles.input, flex: 1 }}
            />
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLocation}
              style={styles.detectButton}
            >
              {detectingLocation ? 'Detecting...' : '📍 Detect'}
            </button>
          </div>
          {lat && lng && (
            <p style={styles.coords}>✓ Location detected automatically</p>
          )}
        </div>

        {/* Error / Success */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Job posted successfully! Redirecting...</div>}

        {/* Submit */}
        <button type="submit" disabled={loading || success} style={styles.submitButton}>
          {loading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 32 },
  infoBox: { background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 8, padding: 12, marginBottom: 24, color: '#3b82f6' },
  form: { maxWidth: 600 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  select: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  radioGroup: { display: 'flex', gap: 20, marginBottom: 12 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#94a3b8' },
  locationRow: { display: 'flex', gap: 8 },
  detectButton: { background: '#334155', border: 'none', borderRadius: 12, padding: '0 20px', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  coords: { fontSize: 12, color: '#22c55e', marginTop: 4 },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444' },
  successBox: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e' },
  submitButton: { width: '100%', background: '#22c55e', color: '#020617', border: 'none', padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
}