'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .single();
    if (!mechanic) {
      router.push('/marketplace/mechanics/register');
      return;
    }
    if (mechanic.subscription_status === 'active') {
      router.push('/marketplace/mechanics/dashboard');
      return;
    }
    setMechanicId(mechanic.id);
    setChecking(false);
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
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.centered}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Choose Your Subscription</h1>
      <div style={styles.plansGrid}>
        {PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            style={{
              ...styles.planCard,
              borderColor: selectedPlan === plan.id ? theme.colors.primary : theme.colors.border.light,
            }}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <h2 style={styles.planName}>{plan.name}</h2>
            <p style={styles.planPrice}>
              £{plan.price} <span style={styles.planPeriod}>/mo</span>
            </p>
            <ul style={styles.featureList}>
              {plan.features.map((feat, i) => (
                <li key={i} style={styles.featureItem}>
                  <Check size={16} color={theme.colors.primary} />
                  {feat}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <button
        onClick={handleSubscribe}
        disabled={!selectedPlan || loading}
        style={{
          ...styles.subscribeButton,
          opacity: !selectedPlan || loading ? 0.5 : 1,
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Processing...
          </>
        ) : (
          'Subscribe Now'
        )}
      </button>
      {error && <div style={styles.errorBox}>{error}</div>}
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    textAlign: 'center',
    marginBottom: theme.spacing[10],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing[6],
    maxWidth: '800px',
    margin: '0 auto',
    marginBottom: theme.spacing[8],
  },
  planCard: {
    background: theme.colors.background.card,
    border: `2px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    cursor: 'pointer',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  planName: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[3],
  },
  planPrice: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing[4],
  },
  planPeriod: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.muted,
    fontWeight: theme.fontWeights.normal,
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
    marginBottom: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  subscribeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    width: 'fit-content',
    margin: '0 auto',
  },
  errorBox: {
    marginTop: theme.spacing[4],
    padding: theme.spacing[3],
    background: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.error,
    textAlign: 'center',
    maxWidth: '400px',
    margin: `${theme.spacing[4]} auto 0`,
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
    gap: theme.spacing[4],
  },
};