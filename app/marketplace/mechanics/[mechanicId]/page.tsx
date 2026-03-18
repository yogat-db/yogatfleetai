'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

// UUID validation helper
const isValidUUID = (uuid: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return regex.test(uuid)
}

interface Mechanic {
  id: string
  business_name: string | null
  phone: string | null
  address: string | null
  subscription_status: string
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  from_user_id: string
  job: { title: string } | null
}

export default function MechanicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const mechanicId = params.mechanicId as string
  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Validate UUID immediately
  if (!isValidUUID(mechanicId)) {
    return (
      <div style={styles.centered}>
        <h2>Invalid Mechanic ID</h2>
        <p>The provided mechanic ID is not valid.</p>
        <button onClick={() => router.push('/marketplace/mechanics')} style={styles.backButton}>
          Back to Mechanics Directory
        </button>
      </div>
    )
  }

  useEffect(() => {
    fetchMechanic()
  }, [mechanicId])

  async function fetchMechanic() {
    try {
      // Fetch mechanic details
      const { data: mechanicData, error: mechError } = await supabase
        .from('mechanics')
        .select('*')
        .eq('id', mechanicId)
        .single()

      if (mechError) {
        if (mechError.code === 'PGRST116') {
          setError('Mechanic not found')
        } else {
          throw mechError
        }
      } else {
        setMechanic(mechanicData)
      }

      // Fetch reviews
      const res = await fetch(`/api/reviews?mechanicId=${mechanicId}`)
      if (!res.ok) throw new Error('Failed to fetch reviews')
      const reviewsData = await res.json()

      const reviewsArray = Array.isArray(reviewsData) ? reviewsData : []
      setReviews(reviewsArray)

      if (reviewsArray.length > 0) {
        const avg = reviewsArray.reduce((acc: number, r: Review) => acc + r.rating, 0) / reviewsArray.length
        setAverageRating(avg)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={styles.centered}>Loading...</div>
  if (error) return <div style={styles.centered}>Error: {error}</div>
  if (!mechanic) return <div style={styles.centered}>Mechanic not found</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1 style={styles.title}>{mechanic.business_name || 'Mechanic'}</h1>
      <div style={styles.card}>
        <p><strong>Address:</strong> {mechanic.address || 'Not provided'}</p>
        <p><strong>Phone:</strong> {mechanic.phone || 'Not provided'}</p>
        <p><strong>Subscription:</strong> {mechanic.subscription_status}</p>
      </div>

      <div style={styles.reviewsSection}>
        <h2 style={styles.sectionTitle}>
          Reviews {averageRating > 0 && `(${averageRating.toFixed(1)} ★)`}
        </h2>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} style={styles.reviewCard}>
              <div style={styles.reviewHeader}>
                <span style={styles.reviewer}>
                  {review.from_user_id ? `User ${review.from_user_id.slice(0, 8)}` : 'Anonymous'}
                </span>
                <span style={styles.rating}>{'★'.repeat(review.rating)}</span>
                <span style={styles.date}>
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={styles.comment}>{review.comment}</p>
              <p style={styles.jobTitle}>Job: {review.job?.title || 'Unknown'}</p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', marginBottom: '24px', cursor: 'pointer' },
  title: { fontSize: '32px', fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '24px' },
  card: { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '32px' },
  reviewsSection: { marginTop: '32px' },
  sectionTitle: { fontSize: '24px', fontWeight: 600, marginBottom: '16px' },
  reviewCard: { background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '12px' },
  reviewHeader: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '14px' },
  reviewer: { color: '#94a3b8' },
  rating: { color: '#fbbf24' },
  date: { color: '#64748b', marginLeft: 'auto' },
  comment: { fontSize: '14px', marginBottom: '4px' },
  jobTitle: { fontSize: '12px', color: '#64748b' },
}