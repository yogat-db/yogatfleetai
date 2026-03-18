'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, MapPin, DollarSign, Clock } from 'lucide-react'

type Job = {
  id: string
  title: string
  description: string | null
  budget: number | null
  location: string | null
  status: string
  created_at: string
  vehicle?: {
    make: string | null
    model: string | null
    license_plate: string
  }
  user?: {
    email: string
  }
}

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs() {
    try {
      setLoading(true)
      const res = await fetch('/api/marketplace/jobs')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load jobs')
      }
      const data = await res.json()
      // Ensure data is an array
      setJobs(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs
    const term = searchTerm.toLowerCase()
    return jobs.filter(job =>
      job.title.toLowerCase().includes(term) ||
      job.description?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term) ||
      job.vehicle?.license_plate.toLowerCase().includes(term)
    )
  }, [jobs, searchTerm])

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading jobs</h2>
        <p>{error}</p>
        <button onClick={fetchJobs} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <div style={styles.header}>
        <h1 style={styles.title}>Repair Jobs</h1>
        <button
          onClick={() => router.push('/marketplace/jobs/post')}
          style={styles.postButton}
        >
          + Post a Job
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <Search size={18} color="#64748b" style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search jobs, vehicles, locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Job Grid */}
      {loading ? (
        <div style={styles.loadingGrid}>
          {[...Array(6)].map((_, i) => <div key={i} style={styles.skeletonCard} />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No jobs found</p>
          {jobs.length === 0 ? (
            <button onClick={() => router.push('/marketplace/jobs/post')} style={styles.emptyButton}>
              Post the first job
            </button>
          ) : (
            <p>Try adjusting your search</p>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              whileHover={{ scale: 1.02 }}
              style={styles.jobCard}
              onClick={() => router.push(`/marketplace/jobs/£{job.id}`)}
            >
              <div style={styles.jobHeader}>
                <h3 style={styles.jobTitle}>{job.title}</h3>
                <span style={styles.jobStatus}>{job.status}</span>
              </div>

              {job.description && (
                <p style={styles.jobDescription}>{job.description}</p>
              )}

              <div style={styles.jobMeta}>
                {job.budget && (
                  <span style={styles.metaItem}>
                    <DollarSign size={14} /> £{job.budget}
                  </span>
                )}
                {job.location && (
                  <span style={styles.metaItem}>
                    <MapPin size={14} /> {job.location}
                  </span>
                )}
                <span style={styles.metaItem}>
                  <Clock size={14} /> {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>

              {job.vehicle && (
                <div style={styles.vehicleInfo}>
                  {job.vehicle.license_plate} – {job.vehicle.make} {job.vehicle.model}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  postButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 30,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 30,
    padding: '12px 16px 12px 40px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  skeletonCard: {
    height: 220,
    background: '#0f172a',
    borderRadius: 16,
    border: '1px solid #1e293b',
    animation: 'pulse 2s infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyButton: {
    marginTop: 16,
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  jobCard: {
    background: '#0f172a',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #1e293b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
  jobStatus: {
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 20,
    background: '#22c55e20',
    color: '#22c55e',
    textTransform: 'capitalize',
  },
  jobDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  jobMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#94a3b8',
  },
  vehicleInfo: {
    fontSize: 13,
    color: '#64748b',
    borderTop: '1px solid #1e293b',
    paddingTop: 12,
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ef4444',
  },
  retryButton: {
    marginTop: 16,
    padding: '10px 24px',
    background: '#22c55e',
    border: 'none',
    borderRadius: 8,
    color: '#020617',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}