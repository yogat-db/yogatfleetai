'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import PaymentForm from '@/components/PaymentForm'
import { supabase } from '@/lib/supabase/client';

export default function JobPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string
  const [job, setJob] = useState<any>(null)
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: jobData, error } = await supabase
        .from('jobs')
        .select('*, applications(*)')
        .eq('id', jobId)
        .single()
      if (error) {
        console.error(error)
        return
      }
      setJob(jobData)
      if (jobData.assigned_mechanic_id) setMechanicId(jobData.assigned_mechanic_id)
      setLoading(false)
    }
    fetchData()
  }, [jobId])

  if (loading) return <div style={styles.centered}>Loading...</div>
  if (!job) return <div style={styles.centered}>Job not found</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Complete Payment</h1>
      <div style={styles.card}>
        <p><strong>Job:</strong> {job.title}</p>
        <p><strong>Amount:</strong> £{job.budget}</p>
        {mechanicId ? (
          <PaymentForm
            amount={job.budget * 100}
            currency="gbp"
            jobId={job.id}
            mechanicId={mechanicId}
            onSuccess={() => router.push(`/marketplace/jobs/${job.id}`)}
          />
        ) : (
          <p>No mechanic selected yet.</p>
        )}
      </div>
    </motion.div>
  )
}

const styles = {
  page: { padding: 40, background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 24 },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid #1e293b', maxWidth: 500 },
}