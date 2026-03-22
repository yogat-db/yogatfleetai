'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import VehiclePicker from '@/components/VehiclePicker'
import QrScanner from '@/components/QrScanner'
import type { Vehicle } from '@/app/types/fleet'


type ScanResult = {
  code: string
  description: string
  causes: string[]
  fix: string
  estimatedCost: number | null
  mechanicNeeded: boolean
}

export default function DiagnosticsPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [dtcCode, setDtcCode] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVehicles()
  }, [])

  async function fetchVehicles() {
    try {
      const res = await fetch('/api/vehicles')
      if (!res.ok) throw new Error('Failed to fetch vehicles')
      const data = await res.json()
      setVehicles(data)
      if (data.length > 0) setSelectedVehicleId(data[0].id)
    } catch (err) {
      console.error('Error fetching vehicles:', err)
    }
  }

  const handleScan = async () => {
    if (!dtcCode.trim()) {
      setError('Please enter a DTC code')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/dtc/${dtcCode.trim().toUpperCase()}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'DTC code not found')
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQrScan = (code: string) => {
    setDtcCode(code)
    setShowScanner(false)
    // Optionally auto‑trigger scan after a short delay
    setTimeout(() => handleScan(), 100)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>AI Neural Diagnostics</h1>
      <p style={styles.subtitle}>
        Scan Diagnostic Trouble Codes (DTC) using real‑time mechanical intelligence.
      </p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Vehicle Scan</h3>

        {/* Vehicle Selector */}
        <div style={styles.field}>
          <label style={styles.label}>Select Active Asset</label>
          <VehiclePicker
            vehicles={vehicles}
            activeId={selectedVehicleId}
            onChange={setSelectedVehicleId}
          />
        </div>

        {/* DTC Input with QR button */}
        <div style={styles.field}>
          <label style={styles.label}>DTC Fault Code</label>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={dtcCode}
              onChange={(e) => setDtcCode(e.target.value.toUpperCase())}
              placeholder="e.g. P0300"
              style={styles.input}
              disabled={loading}
            />
            <button
              onClick={() => setShowScanner(!showScanner)}
              style={styles.scanIconButton}
              title="Scan QR code"
            >
              📷
            </button>
          </div>

          {/* QR Scanner */}
         
          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <QrScanner
                  onScan={handleQrScan}
                  onClose={() => setShowScanner(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={loading || !selectedVehicleId}
          style={styles.scanButton}
        >
          {loading ? 'Scanning...' : 'Initialize Deep Scan'}
        </button>

        {/* Error / Result */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={styles.errorBox}
            >
              {error}
            </motion.div>
          )}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.resultCard}
            >
              <h4 style={styles.resultCode}>{result.code}</h4>
              <p style={styles.resultDescription}>{result.description}</p>

              <h5>Possible Causes</h5>
              <ul style={styles.list}>
                {result.causes.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>

              <h5>Suggested Fix</h5>
              <p>{result.fix}</p>

              {result.estimatedCost && (
                <p><strong>Estimated Cost:</strong> £{result.estimatedCost}</p>
              )}

              {result.mechanicNeeded && (
                <button
                  onClick={() => router.push(`/marketplace/jobs/post?dtc=${result.code}&vehicle=${selectedVehicleId}`)}
                  style={styles.mechanicButton}
                >
                  Find a Mechanic
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '32px',
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#94a3b8',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '6px',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
    color: '#f1f5f9',
    fontSize: '16px',
  },
  scanIconButton: {
    background: '#334155',
    border: 'none',
    borderRadius: '8px',
    padding: '0 12px',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#f1f5f9',
  },
  scanButton: {
    width: '100%',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '16px',
  },
  errorBox: {
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  resultCard: {
    marginTop: '16px',
    padding: '16px',
    background: '#1e293b',
    borderRadius: '8px',
  },
  resultCode: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#22c55e',
    marginBottom: '8px',
  },
  resultDescription: {
    fontSize: '16px',
    marginBottom: '12px',
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: '20px',
    marginBottom: '12px',
    color: '#cbd5e1',
  },
  mechanicButton: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    width: '100%',
    marginTop: '12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
