'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: [
      'Apply to up to 10 jobs per month',
      'Basic profile listing',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    features: [
      'Unlimited job applications',
      'Verified badge',
      'Priority listing in search',
      'Priority support',
    ],
  },
];

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkMechanic();
  }, []);

  const checkMechanic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: mechanic, error: mechError } = await supabase
        .from('mechanics')
        .select('id, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (mechError || !mechanic) {
        router.push('/marketplace/mechanics/register');
        return;
      }

      // If already active, redirect to dashboard
      if (mechanic.subscription_status === 'active') {
        router.push('/marketplace/mechanics/dashboard');
        return;
      }

      setMechanicId(mechanic.id);
    } catch (err) {
      console.error('Error checking mechanic:', err);
      setError('Failed to verify your account. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          mechanicId,
          successUrl: `${window.location.origin}/marketplace/mechanics/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/marketplace/mechanics/subscribe`,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.centered}>
        <Loader2 size={32} style={styles.spinner} />
        <p>Loading subscription options...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <div style={styles.container}>
        <h1 style={styles.title}>Choose Your Subscription</h1>
        <p style={styles.subtitle}>
          Unlock more opportunities with a paid plan
        </p>

        <div style={styles.plansGrid}>
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                ...styles.planCard,
                borderColor: selectedPlan === plan.id
                  ? theme.colors.primary
                  : theme.colors.border.light,
                background: selectedPlan === plan.id
                  ? `${theme.colors.primary}08`
                  : theme.colors.background.card,
              }}
            >
              <h2 style={styles.planName}>{plan.name}</h2>
              <div style={styles.priceContainer}>
                <span style={styles.currency}>£</span>
                <span style={styles.price}>{plan.price}</span>
                <span style={styles.period}>/mo</span>
              </div>
              <ul style={styles.featureList}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={styles.featureItem}>
                    <Check size={16} color={theme.colors.primary} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={!selectedPlan || loading}
          style={{
            ...styles.subscribeButton,
            opacity: (!selectedPlan || loading) ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={styles.buttonSpinner} />
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </button>

        <p style={styles.footnote}>
          No commitment. Cancel anytime. All prices in GBP.
        </p>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    padding: theme.spacing[8],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '1000px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[10],
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[8],
  },
  planCard: {
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    cursor: 'pointer',
    transition: theme.transitions.default,
  },
  planName: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[4],
    color: theme.colors.text.primary,
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: theme.spacing[1],
    marginBottom: theme.spacing[6],
  },
  currency: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text.secondary,
  },
  price: {
    fontSize: '48px',
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
    lineHeight: 1,
  },
  period: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.muted,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  featureItem: {
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing[2],
  fontSize: theme.fontSizes.sm,
  color: theme.colors.text.secondary,
  padding: `${theme.spacing[2]} 0`, // or theme.spacing[2] for all sides
  borderBottom: `1px solid ${theme.colors.border.light}`,
},
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    background: `rgba(239,68,68,0.1)`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[6],
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  subscribeButton: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: theme.transitions.default,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    minWidth: '200px',
    marginBottom: theme.spacing[4],
  },
  buttonSpinner: {
    animation: 'spin 1s linear infinite',
  },
  footnote: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
    background: theme.colors.background.main,
    color: theme.colors.text.secondary,
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    marginBottom: theme.spacing[2],
  },
};

// Add this to your global CSS if not already present:
// @keyframes spin {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }