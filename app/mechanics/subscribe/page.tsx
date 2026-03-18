'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY, // set this in .env
    features: [
      'Unlimited job applications',
      'Priority listing',
      'Verified badge',
      'Access to premium leads',
    ],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 99.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL,
    features: [
      'Everything in Monthly',
      '2 months free',
      'Featured mechanic profile',
      'Priority support',
    ],
  },
]

export default function SubscribePage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!selectedPlan) return
    setLoading(true)
    try {
      const plan = plans.find(p => p.id === selectedPlan)
      if (!plan) throw new Error('Plan not found')

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          planId: plan.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Choose Your Plan</h1>
      <p style={styles.subtitle}>Subscribe to start receiving job leads and grow your business.</p>

      <div style={styles.plansGrid}>
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            style={{
              ...styles.planCard,
              borderColor: selectedPlan === plan.id ? '#22c55e' : '#1e293b',
            }}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <h2 style={styles.planName}>{plan.name}</h2>
            <p style={styles.planPrice}>
              <span style={styles.price}>£{plan.price}</span>
              <span style={styles.period}>/{plan.id === 'annual' ? 'yr' : 'mo'}</span>
            </p>
            <ul style={styles.featuresList}>
              {plan.features.map((feat, i) => (
                <li key={i} style={styles.featureItem}>
                  <Check size={16} color="#22c55e" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPlan(plan.id)
              }}
              style={{
                ...styles.selectButton,
                background: selectedPlan === plan.id ? '#22c55e' : 'transparent',
                color: selectedPlan === plan.id ? '#020617' : '#22c55e',
                borderColor: '#22c55e',
              }}
            >
              {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
            </button>
          </motion.div>
        ))}
      </div>

      <div style={styles.actionContainer}>
        <button
          onClick={handleSubscribe}
          disabled={!selectedPlan || loading}
          style={styles.subscribeButton}
        >
          {loading ? 'Redirecting...' : 'Continue to Payment'}
        </button>
        <p style={styles.secureNote}>
          <Sparkles size={14} />
          Secure payment via Stripe
        </p>
      </div>
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
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '40px',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto 40px',
  },
  planCard: {
    background: '#0f172a',
    border: '1px solid',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  planName: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  planPrice: {
    marginBottom: '16px',
  },
  price: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#22c55e',
  },
  period: {
    fontSize: '14px',
    color: '#64748b',
    marginLeft: '4px',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#cbd5e1',
  },
  selectButton: {
    width: '100%',
    background: 'transparent',
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionContainer: {
    textAlign: 'center',
  },
  subscribeButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '30px',
    padding: '14px 40px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '12px',
  },
  secureNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: '#64748b',
    fontSize: '12px',
  },
}