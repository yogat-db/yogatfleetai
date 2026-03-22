'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function MechanicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const mechanicId = params.id as string
  const [mechanic, setMechanic] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMechanic = async () => {
      const { data } = await supabase
        .from('mechanics')
        .select('*, user:auth.users(email)')
        .eq('id', mechanicId)
        .single()
      setMechanic(data)
      setLoading(false)
    }
    fetchMechanic()
  }, [mechanicId])

  if (loading) return <div style={styles.centered}>Loading...</div>
  if (!mechanic) return <div style={styles.centered}>Mechanic not found</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1>{mechanic.business_name}</h1>
      <p>{mechanic.phone}</p>
      <p>{mechanic.address}</p>
      {mechanic.verified && <span style={styles.verified}>✓ Verified</span>}
      <button onClick={() => router.push(`/marketplace/jobs?mechanic=${mechanicId}`)}>View Jobs</button>
    </motion.div>
  )
}

const styles = {
  page: { padding: 40, background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  verified: { background: '#22c55e20', color: '#22c55e', padding: '2px 8px', borderRadius: 12, fontSize: 12 },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
