'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe/client'
import PaymentForm from '@/components/PaymentForm'

export default function JobPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = params.jobId as string
  const amount = parseInt(searchParams.get('amount') || '0') // amount in smallest currency unit (pence)

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!amount) {
      setError('Invalid amount')
      setLoading(false)
      return
    }

    const fetchPaymentIntent = async () => {
      try {
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, amount }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClientSecret(data.clientSecret)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPaymentIntent()
  }, [jobId, amount])

  if (loading) return <div style={styles.centered}>Loading payment...</div>
  if (error) return <div style={styles.centered}>Error: {error}</div>
  if (!clientSecret) return <div style={styles.centered}>No payment intent</div>

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Complete Payment</h1>
      <p style={styles.subtitle}>
        Amount: ${(amount / 100).toFixed(2)} (funds held in escrow until job completion)
      </p>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm
          clientSecret={clientSecret}
          onSuccess={() => router.push(`/marketplace/jobs/${jobId}?payment=success`)}
        />
      </Elements>
    </div>
  )
}

const styles = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: '32px', fontWeight: 700, marginBottom: '8px' },
  subtitle: { color: '#94a3b8', marginBottom: '32px' },
}