'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Mail, Phone, MapPin, Star } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Mechanic } from '@/app/types/marketplace'
type Mechanic = {
  id: string
  user_id: string
  business_name: string
  phone: string | null
  address: string | null
  lat: number | null
  lng: number | null
  verified: boolean
  subscription_status: string
  created_at: string
  user?: {
    email: string
  }
}

export default function AdminMechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('unverified')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchMechanics()
  }, [])

  const fetchMechanics = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabaseAdmin
        .from('mechanics')
        .select(`
          *,
          user:auth.users!inner(email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMechanics(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (mechanicId: string, verified: boolean) => {
    setProcessing(mechanicId)
    try {
      const { error } = await supabaseAdmin
        .from('mechanics')
        .update({ verified })
        .eq('id', mechanicId)

      if (error) throw error
      setMechanics(mechanics.map(m =>
        m.id === mechanicId ? { ...m, verified } : m
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const filteredMechanics = mechanics.filter(m => {
    if (filter === 'verified') return m.verified
    if (filter === 'unverified') return !m.verified
    return true
  })

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
      <h1 style={styles.title}>Mechanic Verification</h1>

      <div style={styles.filterTabs}>
        {(['all', 'verified', 'unverified'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterTab,
              background: filter === status ? '#22c55e' : 'transparent',
              color: filter === status ? '#020617' : '#94a3b8',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filteredMechanics.map((mechanic) => (
          <motion.div
            key={mechanic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              ...styles.card,
              borderColor: mechanic.verified ? '#22c55e' : '#1e293b',
            }}
          >
            <div style={styles.cardHeader}>
              <h3 style={styles.businessName}>{mechanic.business_name}</h3>
              {mechanic.verified ? (
                <CheckCircle size={20} color="#22c55e" />
              ) : (
                <XCircle size={20} color="#ef4444" />
              )}
            </div>

            <div style={styles.detailRow}>
              <Mail size={14} color="#64748b" />
              <span>{mechanic.user?.email}</span>
            </div>

            {mechanic.phone && (
              <div style={styles.detailRow}>
                <Phone size={14} color="#64748b" />
                <span>{mechanic.phone}</span>
              </div>
            )}

            {mechanic.address && (
              <div style={styles.detailRow}>
                <MapPin size={14} color="#64748b" />
                <span>{mechanic.address}</span>
              </div>
            )}

            <div style={styles.detailRow}>
              <Star size={14} color="#64748b" />
              <span>Subscription: {mechanic.subscription_status}</span>
            </div>

            <div style={styles.cardFooter}>
              <span style={styles.date}>
                Joined: {new Date(mechanic.created_at).toLocaleDateString()}
              </span>
              {!mechanic.verified ? (
                <button
                  onClick={() => handleVerify(mechanic.id, true)}
                  disabled={processing === mechanic.id}
                  style={styles.verifyButton}
                >
                  {processing === mechanic.id ? '...' : 'Verify'}
                </button>
              ) : (
                <button
                  onClick={() => handleVerify(mechanic.id, false)}
                  disabled={processing === mechanic.id}
                  style={styles.unverifyButton}
                >
                  {processing === mechanic.id ? '...' : 'Remove'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#0f172a',
    border: '1px solid',
    borderRadius: '16px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  businessName: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  cardFooter: {
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: '12px',
    color: '#64748b',
  },
  verifyButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  unverifyButton: {
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}