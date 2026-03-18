'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Briefcase, Trash2, Eye, AlertCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Job = {
  id: string
  title: string
  description: string | null
  budget: number | null
  status: string
  created_at: string
  user_id: string
  vehicle_id: string | null
  user?: {
    email: string
  }
  vehicle?: {
    license_plate: string
    make: string
    model: string
  }
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabaseAdmin
        .from('jobs')
        .select(`
          *,
          user:auth.users!inner(email),
          vehicle:vehicles(license_plate, make, model)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Type assertion to match Job[] – data conforms to the shape defined above
      setJobs((data ?? []) as Job[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return
    setDeleting(jobId)
    try {
      const { error } = await supabaseAdmin
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
      setJobs(jobs.filter(j => j.id !== jobId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(j => j.status === filter)

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    assigned: jobs.filter(j => j.status === 'assigned').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <AlertCircle size={32} color="#ef4444" />
        <p>{error}</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Jobs Management</h1>

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {(['all', 'open', 'assigned', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterTab,
              background: filter === status ? '#22c55e' : 'transparent',
              color: filter === status ? '#020617' : '#94a3b8',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Posted By</th>
              <th>Vehicle</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <div style={styles.titleCell}>
                    <Briefcase size={16} color="#64748b" />
                    {job.title}
                  </div>
                </td>
                <td>£{job.budget?.toFixed(2) ?? '—'}</td>
                <td>
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    style={getStatusStyle(job.status)}
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>{job.user?.email}</td>
                <td>
                  {job.vehicle 
                    ? `${job.vehicle.make} ${job.vehicle.model} (${job.vehicle.license_plate})`
                    : '—'}
                </td>
                <td>{new Date(job.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => router.push(`/marketplace/jobs/${job.id}`)}
                      style={styles.viewButton}
                      title="View job"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={deleting === job.id}
                      style={styles.deleteButton}
                      title="Delete job"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

const getStatusStyle = (status: string) => ({
  background: 
    status === 'open' ? '#22c55e20' :
    status === 'assigned' ? '#3b82f620' :
    status === 'completed' ? '#64748b20' : '#ef444420',
  color: 
    status === 'open' ? '#22c55e' :
    status === 'assigned' ? '#3b82f6' :
    status === 'completed' ? '#64748b' : '#ef4444',
  border: 'none',
  borderRadius: '12px',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
})

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
    marginBottom: '32px',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #334155',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tableWrapper: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  titleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionButtons: {
    display: 'flex',
    gap: '4px',
  },
  viewButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}