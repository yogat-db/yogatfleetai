// app/marketplace/mechanics/subscribe/page.tsx
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || 'price_basic',
    features: ['Apply to up to 10 jobs per month', 'Basic profile listing', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    features: ['Unlimited job applications', 'Verified badge', 'Priority listing in search', 'Priority support'],
  },
];

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [existingPlan, setExistingPlan] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkMechanic();
  }, []);

  const checkMechanic = async () => {
    setChecking(true);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        router.push('/login');
        return;
      }

      const { data: mechanic, error: mechErr } = await supabase
        .from('mechanics')
        .select('id, plan, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (mechErr || !mechanic) {
        // No mechanic profile → redirect to registration
        router.push('/marketplace/mechanics/register');
        return;
      }

      // If already on a paid plan (pro) or active subscription, redirect to dashboard
      if (mechanic.plan === 'pro' || mechanic.subscription_status === 'active') {
        router.push('/marketplace/mechanics/dashboard');
        return;
      }

      setMechanicId(mechanic.id);
      setExistingPlan(mechanic.plan || null);
    } catch (err) {
      console.error('Check mechanic error:', err);
      setError('Unable to verify mechanic status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);

    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Invalid plan selected');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          priceId: plan.priceId,
          mechanicId,
          successUrl: `${window.location.origin}/marketplace/mechanics/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/marketplace/mechanics/subscribe`,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
      if (!data.url) throw new Error('No checkout URL returned');

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.centered}>
        <Loader2 className="animate-spin" size={40} color={theme.colors.primary} />
        <p style={{ marginTop: 16, color: theme.colors.text.secondary }}>Loading subscription options...</p>
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Choose Your Subscription</h1>
        <p style={styles.subtitle}>
          Upgrade to access more jobs and grow your business
        </p>

        <div style={styles.plansGrid}>
          {PLANS.map((plan) => {
            const isCurrentPlan = existingPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                style={{
                  ...styles.planCard,
                  borderColor:
                    selectedPlan === plan.id
                      ? theme.colors.primary
                      : theme.colors.border.light,
                  opacity: isCurrentPlan ? 0.7 : 1,
                  cursor: isCurrentPlan ? 'default' : 'pointer',
                }}
                onClick={() => !isCurrentPlan && setSelectedPlan(plan.id)}
              >
                {isCurrentPlan && (
                  <div style={styles.currentBadge}>Current Plan</div>
                )}
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
            );
          })}
        </div>

        <button
          onClick={handleSubscribe}
          disabled={!selectedPlan || loading || checking}
          style={{
            ...styles.subscribeButton,
            opacity: !selectedPlan || loading || checking ? 0.5 : 1,
            cursor: !selectedPlan || loading || checking ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </button>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <p style={styles.footnote}>
          You can cancel your subscription at any time. Payment is processed securely via Stripe.
        </p>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
    padding: '40px 20px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
  },
  title: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '8px',
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '16px',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: '48px',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
    maxWidth: '800px',
    margin: '0 auto 48px auto',
  },
  planCard: {
    position: 'relative',
    background: theme.colors.background.card,
    border: `2px solid ${theme.colors.border.light}`,
    borderRadius: '24px',
    padding: '32px',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  currentBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: '12px',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '100px',
  },
  planName: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '12px',
    color: theme.colors.text.primary,
  },
  planPrice: {
    fontSize: '36px',
    fontWeight: 800,
    color: theme.colors.primary,
    marginBottom: '24px',
  },
  planPeriod: {
    fontSize: '14px',
    color: theme.colors.text.muted,
    fontWeight: 400,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    fontSize: '14px',
    color: theme.colors.text.secondary,
  },
  subscribeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: '100px',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 700,
    color: theme.colors.background.main,
    width: 'fit-content',
    margin: '0 auto',
    transition: 'opacity 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '24px',
    padding: '12px 20px',
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: '12px',
    color: theme.colors.status.critical,
    fontSize: '14px',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  footnote: {
    fontSize: '12px',
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: '32px',
  },
};