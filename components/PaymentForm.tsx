'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/client';
import theme from '@/app/theme';

interface PaymentFormProps {
  amount: number; // in cents
  currency: string;
  jobId: string;
  mechanicId: string;
  onSuccess: () => void;
}

function PaymentFormContent({ amount, currency, jobId, mechanicId, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/marketplace/jobs/${jobId}?payment_success=true`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
    } else {
      // Payment succeeded, update job status
      const res = await fetch(`/api/marketplace/jobs/${jobId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId }),
      });
      if (res.ok) onSuccess();
      else setError('Payment succeeded but job assignment failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <PaymentElement />
      {error && <div style={styles.error}>{error}</div>}
      <button
        type="submit"
        disabled={!stripe || loading}
        style={styles.button}
      >
        {loading ? 'Processing...' : `Pay £${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof getStripe> | null>(null);

  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  if (!stripePromise) return <div>Loading payment form...</div>;

  return (
    <Elements stripe={stripePromise} options={{ mode: 'payment', amount: props.amount, currency: props.currency }}>
      <PaymentFormContent {...props} />
    </Elements>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  button: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
};