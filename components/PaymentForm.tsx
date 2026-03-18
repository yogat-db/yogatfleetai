'use client'

import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe/client'

interface PaymentFormProps {
  amount: number // in pence (smallest currency unit)
  currency?: string
  jobId: string
  mechanicId: string
  onSuccess: () => void
}

function PaymentFormContent({ amount, currency = 'gbp', jobId, mechanicId, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      setError('Stripe is not initialized. Please refresh the page.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/jobs/${jobId}/success`,
        },
        redirect: 'if_required',
      })

      if (submitError) {
        // Use optional chaining and fallback message
        setError(submitError.message || 'Payment failed. Please try again.')
      } else {
        onSuccess()
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const currencySymbol = currency === 'gbp' ? '£' : '$'

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !stripe || !elements}
        style={{
          ...styles.button,
          opacity: loading || !stripe || !elements ? 0.5 : 1,
        }}
      >
        {loading ? 'Processing...' : `Pay ${currencySymbol}${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  )
}

export default function PaymentForm(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const res = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: props.jobId,
            mechanicId: props.mechanicId,
            amount: props.amount, // already in pence
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to initialize payment')
        setClientSecret(data.clientSecret)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClientSecret()
  }, [props.jobId, props.mechanicId, props.amount])

  if (loading) {
    return (
      <div style={styles.loadingBox}>
        <div style={styles.spinner} />
        <p>Loading payment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          style={styles.retryButton}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div style={styles.errorBox}>
        <p>Payment initialization failed. Please try again.</p>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentFormContent {...props} />
    </Elements>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: '100%',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 8,
    color: '#ef4444',
    textAlign: 'center',
  },
  loadingBox: {
    marginTop: 16,
    padding: 12,
    textAlign: 'center',
    color: '#94a3b8',
  },
  spinner: {
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #22c55e',
    borderRadius: '50%',
    width: 24,
    height: 24,
    animation: 'spin 1s linear infinite',
    margin: '0 auto 8px',
  },
  retryButton: {
    marginTop: 8,
    padding: '6px 12px',
    background: '#22c55e',
    border: 'none',
    borderRadius: 4,
    color: '#020617',
    cursor: 'pointer',
  },
}