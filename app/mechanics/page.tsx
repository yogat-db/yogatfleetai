'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, Phone, Star, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Mechanic = {
  id: string
  business_name: string
  phone: string | null
  address: string | null
  verified: boolean
  subscription_status: string
  created_at: string
}

export default function MechanicsDirectoryPage() {
  const router = useRouter()
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMechanics()
  }, [])

  async function fetchMechanics() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('mechanics')
        .select('*')
        .eq('subscription_status', 'active')
        .order('verified', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setMechanics(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading mechanics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={fetchMechanics} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Mechanics Directory</h1>
      <p style={styles.subtitle}>Find trusted mechanics near you</p>

      <div style={styles.grid}>
        {mechanics.length === 0 ? (
          <p style={styles.empty}>No mechanics found</p>
        ) : (
          mechanics.map((mech, i) => (
            <motion.div
              key={mech.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              style={styles.card}
              onClick={() => router.push(`/marketplace/mechanics/${mech.id}`)}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.businessName}>{mech.business_name}</h3>
                {mech.verified ? (
                  <CheckCircle size={20} color="#22c55e" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
              </div>
              {mech.address && (
                <div style={styles.detail}>
                  <MapPin size={14} color="#64748b" />
                  <span>{mech.address}</span>
                </div>
              )}
              {mech.phone && (
                <div style={styles.detail}>
                  <Phone size={14} color="#64748b" />
                  <span>{mech.phone}</span>
                </div>
              )}
              <div style={styles.cardFooter}>
                <div style={styles.ratingPlaceholder}>
                  <Star size={14} color="#fbbf24" />
                  <span>New</span>
                </div>
                <button style={styles.viewButton}>View Profile</button>
              </div>
            </motion.div>
          ))
        )}
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
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 },
  subtitle: { color: '#94a3b8', marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  businessName: { fontSize: 18, fontWeight: 600, margin: 0 },
  detail: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#94a3b8' },
  cardFooter: { marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12 },
  ratingPlaceholder: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fbbf24' },
  viewButton: { background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  retryButton: { marginTop: 16, padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 4, color: '#020617', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: 40, color: '#64748b' },
}
