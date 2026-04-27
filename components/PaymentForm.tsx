'use client';

import { useState, useEffect, useMemo } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { getStripe } from '@/lib/stripe/client';
import theme from '@/app/theme';

interface PaymentFormProps {
  amount: number;        // in cents/pence, e.g., 1500 for £15.00
  currency: string;      // e.g., 'gbp', 'usd'
  jobId: string;
  mechanicId: string;
  onSuccess: () => void;
}

// ------------------------------------------------------------------
// Inner form that uses the Elements context
// ------------------------------------------------------------------
function PaymentFormContent({ amount, onSuccess }: Pick<PaymentFormProps, 'amount' | 'onSuccess'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return; // Stripe.js not ready

    setLoading(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.');
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded – call parent callback
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.paymentContainer}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div style={styles.errorContainer}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          ...styles.button,
          opacity: loading || !stripe ? 0.7 : 1,
          cursor: loading || !stripe ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Lock size={16} />
        )}
        {loading ? 'Processing...' : `Pay £${(amount / 100).toFixed(2)}`}
      </button>

      <div style={styles.footer}>
        <ShieldCheck size={14} color={theme.colors.status.healthy} />
        <span>Secure encrypted payment via Stripe</span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}

// ------------------------------------------------------------------
// Main PaymentForm component – fetches client secret and renders Elements
// ------------------------------------------------------------------
export default function PaymentForm(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the PaymentIntent client secret from your backend
  useEffect(() => {
    async function fetchClientSecret() {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: props.amount,
            currency: props.currency,
            jobId: props.jobId,
            mechanicId: props.mechanicId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to initialise payment');
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('PaymentIntent error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchClientSecret();
  }, [props.amount, props.currency, props.jobId, props.mechanicId]);

  const stripePromise = useMemo(() => getStripe(), []);

  // Stripe Appearance – sync with your app theme
  const appearance = useMemo(
    () => ({
      theme: 'night' as const,
      variables: {
        colorPrimary: theme.colors.primary,
        colorBackground: theme.colors.background.card,
        colorText: theme.colors.text.primary,
        colorDanger: theme.colors.status.critical,
        fontFamily: theme.fontFamilies.sans,
        borderRadius: theme.borderRadius.md,
        spacingGrid: '16px',
      },
      rules: {
        '.Input': {
          border: `1px solid ${theme.colors.border.medium}`,
          boxShadow: 'none',
        },
        '.Label': {
          color: theme.colors.text.secondary,
          fontWeight: '500',
        },
      },
    }),
    []
  );

  // Loading / error states before Stripe Elements are ready
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Initialising secure payment...</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={20} />
        <span>Unable to set up payment. Please try again.</span>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
      }}
    >
      <PaymentFormContent amount={props.amount} onSuccess={props.onSuccess} />
    </Elements>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[6],
  },
  paymentContainer: {
    padding: theme.spacing[2],
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    height: '48px',
    color: theme.colors.background.main,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.bold,
    transition: 'all 0.2s ease',
    boxShadow: theme.shadows.glow,
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    color: theme.colors.status.critical,
    fontSize: theme.fontSizes.sm,
    background: `${theme.colors.status.critical}10`,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.status.critical}30`,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    fontSize: '11px',
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[6],
    color: theme.colors.text.muted,
    fontSize: theme.fontSizes.sm,
  },
};