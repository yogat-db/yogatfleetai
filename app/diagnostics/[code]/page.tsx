'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, Wrench, DollarSign, Calendar, ArrowLeft } from 'lucide-react'
import VehiclePicker from '@/components/VehiclePicker'
import { getDTCInfo } from '@/lib/ai/diagnostics'

export default function DTCDetailPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [dtc, setDtc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    fetchDTC()
    fetchVehicles()
  }, [code])

  async function fetchDTC() {
    try {
      setLoading(true)
      const res = await fetch(`/api/dtc/${code}`)
      if (!res.ok) throw new Error('DTC code not found')
      const data = await res.json()
      setDtc(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchVehicles() {
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      setVehicles(data)
      if (data.length > 0) setSelectedVehicleId(data[0].id)
    } catch (err) {
      console.error('Failed to fetch vehicles')
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading DTC information...</p>
      </div>
    )
  }

  if (error || !dtc) {
    return (
      <div style={styles.centered}>
        <h2>DTC Code Not Found</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/diagnostics')} style={styles.button}>
          Back to Diagnostics
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>{dtc.code}</h1>
        <div
          style={{
            ...styles.severityBadge,
            backgroundColor: dtc.mechanicNeeded ? '#ef444420' : '#22c55e20',
            color: dtc.mechanicNeeded ? '#ef4444' : '#22c55e',
          }}
        >
          {dtc.mechanicNeeded ? 'Mechanic Required' : 'DIY Friendly'}
        </div>
      </div>

      <p style={styles.description}>{dtc.description}</p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Possible Causes</h3>
        <ul style={styles.list}>
          {dtc.causes.map((cause: string, i: number) => (
            <li key={i}>{cause}</li>
          ))}
        </ul>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Suggested Fix</h3>
        <p style={styles.fixText}>{dtc.fix}</p>
      </div>

      {dtc.estimatedCost && (
        <div style={styles.costCard}>
          <DollarSign size={20} color="#22c55e" />
          <span>
            <strong>Estimated Cost:</strong> £{dtc.estimatedCost}
          </span>
        </div>
      )}

      {/* Vehicle Selector & Post Job */}
      {vehicles.length > 0 && (
        <div style={styles.vehicleSection}>
          <h3 style={styles.cardTitle}>Select a vehicle for repair job</h3>
          <VehiclePicker
            vehicles={vehicles}
            activeId={selectedVehicleId}
            onChange={setSelectedVehicleId}
          />
          <button
            onClick={() => router.push(`/marketplace/jobs/post?dtc=${dtc.code}&vehicleId=${selectedVehicleId}`)}
            style={styles.primaryButton}
            disabled={!selectedVehicleId}
          >
            <Wrench size={16} />
            Post a Repair Job
          </button>
        </div>
      )}

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 48, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  severityBadge: { padding: '6px 12px', borderRadius: 30, fontSize: 14, fontWeight: 600 },
  description: { fontSize: 18, color: '#94a3b8', marginBottom: 24 },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 600, color: '#94a3b8', marginBottom: 12 },
  list: { listStyleType: 'disc', paddingLeft: 20, color: '#cbd5e1', lineHeight: 1.6 },
  fixText: { color: '#f1f5f9', lineHeight: 1.6 },
  costCard: { background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 12, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#22c55e', fontSize: 18 },
  vehicleSection: { marginTop: 24 },
  primaryButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, width: '100%' },
  button: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', marginTop: 16 },
}