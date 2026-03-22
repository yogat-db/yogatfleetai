'use client'

import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe/client'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface PaymentFormProps {
  amount: number      // in pence (e.g., 1000 = £10.00)
  currency?: string   // default 'gbp'
  jobId: string
  mechanicId: string
  onSuccess: () => void
}

function PaymentFormContent({
  amount,
  currency = 'gbp',
  jobId,
  mechanicId,
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/marketplace/jobs/${jobId}/success`,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      // ✅ Safe error message handling
      setError(submitError.message || 'Payment failed')
    } else {
      onSuccess()
    }
    setLoading(false)
  }

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
          ...styles.submitButton,
          opacity: loading || !stripe || !elements ? 0.5 : 1,
        }}
      >
        {loading ? 'Processing...' : `Pay ${currency === 'gbp' ? '£' : '$'}${(amount / 100).toFixed(2)}`}
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
            amount: props.amount,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to initialise payment')
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
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p>Loading payment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Payment initialisation failed.</p>
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
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: '#94a3b8',
  },
  spinner: {
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #22c55e',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  submitButton: {
    width: '100%',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '4px',
    color: '#020617',
    cursor: 'pointer',
  },
}

// Add global spinner animation (optional)
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}