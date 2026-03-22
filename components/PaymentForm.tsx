'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe/client';
import theme from '@/app/theme';

interface PaymentFormProps {
  amount: number;      // in cents (e.g., 2999 for £29.99)
  currency: string;
  jobId: string;
  mechanicId: string;
  onSuccess?: () => void;
}

const CheckoutForm = ({ amount, onSuccess }: { amount: number; onSuccess?: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
    } else {
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div style={styles.error}>{error}</div>}
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          ...styles.button,
          opacity: !stripe || loading ? 0.5 : 1,
          cursor: !stripe || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : `Pay £${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};

export default function PaymentForm({ amount, currency, jobId, mechanicId, onSuccess }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency, jobId, mechanicId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create payment intent');
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClientSecret();
  }, [amount, currency, jobId, mechanicId]);

  if (loading) {
    return <div style={styles.loading}>Loading payment form...</div>;
  }

  if (error) {
    return <div style={styles.errorBox}>{error}</div>;
  }

  if (!clientSecret) {
    return <div style={styles.errorBox}>Unable to initialise payment.</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}

const styles = {
  button: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    marginTop: theme.spacing[4],
    width: '100%',
    transition: theme.transitions.default,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
    marginTop: theme.spacing[2],
  },
  errorBox: {
    padding: theme.spacing[3],
    background: 'rgba(239,68,68,0.1)',
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.error,
    textAlign: 'center' as const,
  },
  loading: {
    textAlign: 'center' as const,
    color: theme.colors.text.secondary,
    padding: theme.spacing[4],
  },
};
