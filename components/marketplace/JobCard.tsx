'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function JobCard({ job }: any) {
  const router = useRouter()
  return (
    <motion.div whileHover={{ scale: 1.02 }} style={styles.card} onClick={() => router.push(`/marketplace/jobs/${job.id}`)}>
      <h3 style={styles.title}>{job.title}</h3>
      <p style={styles.description}>{job.description.substring(0, 100)}...</p>
      <div style={styles.footer}>
        <span>Budget: ${job.budget_min}–{job.budget_max}</span>
        <span style={styles.status}>{job.status}</span>
      </div>
    </motion.div>
  )
}

const styles = {
  card: { background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b', cursor: 'pointer' },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#f1f5f9' },
  description: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  footer: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' },
  status: { background: '#334155', padding: '2px 8px', borderRadius: 12 },
}