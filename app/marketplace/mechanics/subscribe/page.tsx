'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

type SubscriptionPlan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  interval: 'month' | 'year'
}

export default function SubscribePage() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      const res = await fetch('/api/subscription-plans')
      if (!res.ok) throw new Error('Failed to load plans')
      const data = await res.json()
      setPlans(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId: string) {
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url // redirect to Stripe
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCheckoutLoading(null)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(price / 100)
  }

  const monthlyPlans = plans.filter(p => p.interval === 'month')
  const yearlyPlans = plans.filter(p => p.interval === 'year')

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading subscription plans...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchPlans} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Choose a Subscription Plan</h1>
      <p style={styles.subtitle}>Get access to job leads and grow your mechanic business.</p>

      {/* Monthly Plans */}
      {monthlyPlans.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Monthly</h2>
          <div style={styles.grid}>
            {monthlyPlans.map(plan => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                style={styles.planCard}
              >
                <h3 style={styles.planName}>{plan.name}</h3>
                <p style={styles.planDesc}>{plan.description}</p>
                <p style={styles.planPrice}>
                  {formatPrice(plan.price, plan.currency)}<span style={styles.planInterval}>/month</span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  style={styles.subscribeButton}
                >
                  {checkoutLoading === plan.id ? 'Redirecting...' : 'Subscribe'}
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Yearly Plans */}
      {yearlyPlans.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Yearly (Save 20%)</h2>
          <div style={styles.grid}>
            {yearlyPlans.map(plan => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                style={styles.planCard}
              >
                <h3 style={styles.planName}>{plan.name}</h3>
                <p style={styles.planDesc}>{plan.description}</p>
                <p style={styles.planPrice}>
                  {formatPrice(plan.price, plan.currency)}<span style={styles.planInterval}>/year</span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  style={styles.subscribeButton}
                >
                  {checkoutLoading === plan.id ? 'Redirecting...' : 'Subscribe'}
                </button>
              </motion.div>
            ))}
          </div>
        </>
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
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 },
  subtitle: { color: '#94a3b8', marginBottom: 32 },
  sectionTitle: { fontSize: 24, fontWeight: 600, marginTop: 24, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  planCard: { background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid #1e293b', cursor: 'pointer' },
  planName: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  planDesc: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  planPrice: { fontSize: 28, fontWeight: 700, color: '#22c55e', marginBottom: 20 },
  planInterval: { fontSize: 14, color: '#64748b', marginLeft: 4 },
  subscribeButton: { width: '100%', background: '#22c55e', color: '#020617', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  retryButton: { marginTop: 16, padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 4, color: '#020617', cursor: 'pointer' },
}