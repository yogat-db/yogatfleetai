'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: ['Apply to up to 10 jobs per month', 'Basic profile listing', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    features: ['Unlimited job applications', 'Verified badge', 'Priority listing in search', 'Priority support'],
  },
];

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Choose Your Subscription</h1>
      <div style={styles.plansGrid}>
        {PLANS.map((plan) => (
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
              £{plan.price} <span style={styles.planPeriod}>/mo</span>
            </p>
            <ul style={styles.featureList}>
              {plan.features.map((feat, i) => (
                <li key={i} style={styles.featureItem}>
                  <Check size={16} color="#22c55e" />
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
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
      {error && <div style={styles.errorBox}>{error}</div>}
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 40, textAlign: 'center' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto 32px' },
  planCard: { background: '#0f172a', border: '2px solid', borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s' },
  planName: { fontSize: 24, fontWeight: 600, marginBottom: 12 },
  planPrice: { fontSize: 36, fontWeight: 700, color: '#22c55e', marginBottom: 20 },
  planPeriod: { fontSize: 16, color: '#64748b', fontWeight: 400 },
  featureList: { listStyle: 'none', padding: 0, margin: 0 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#94a3b8' },
  subscribeButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#22c55e', color: '#020617', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 600, width: 'fit-content', margin: '0 auto', cursor: 'pointer' },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', textAlign: 'center', maxWidth: 400, margin: '16px auto 0' },
};