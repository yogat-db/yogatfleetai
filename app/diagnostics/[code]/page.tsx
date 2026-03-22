'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getDTCInfo, type DTCInfo } from '@/lib/ai/diagnostics'

export default function DTCDetailPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [dtc, setDtc] = useState<DTCInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    const info = getDTCInfo(code)
    setDtc(info)
    setLoading(false)
  }, [code])

  if (loading) return <div style={styles.centered}>Loading...</div>
  if (!dtc) return <div style={styles.centered}>DTC code not found</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1 style={styles.code}>{dtc.code}</h1>
      <p style={styles.description}>{dtc.description}</p>

      <div style={styles.card}>
        <h3>Possible Causes</h3>
        <ul style={styles.list}>
          {dtc.causes.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      <div style={styles.card}>
        <h3>Suggested Fix</h3>
        <p>{dtc.fix}</p>
        {dtc.estimatedCost && <p><strong>Est. Cost:</strong> £{dtc.estimatedCost}</p>}
      </div>
    </motion.div>
  )
}

const styles = {
  page: { padding: 40, background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  code: { fontSize: 48, fontWeight: 700, color: '#22c55e', marginBottom: 8 },
  description: { fontSize: 18, color: '#94a3b8', marginBottom: 24 },
  card: { background: '#0f172a', padding: 20, borderRadius: 16, border: '1px solid #1e293b', marginBottom: 20 },
  list: { listStyleType: 'disc', paddingLeft: 20, color: '#cbd5e1' },
}