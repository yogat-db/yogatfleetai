'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import theme from '@/app/theme';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (sessionId) console.log('Subscription successful:', sessionId);
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    const redirect = setTimeout(() => router.push('/marketplace/mechanics/dashboard'), 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [sessionId, router]);

  return (
    <div style={styles.card}>
      <CheckCircle size={64} color={theme.colors.primary} />
      <h1 style={styles.title}>Subscription Successful!</h1>
      <p style={styles.message}>
        Thank you for subscribing. Your mechanic account is now active.
      </p>
      <p style={styles.redirect}>
        Redirecting to your dashboard in {countdown} seconds...
      </p>
      <button
        onClick={() => router.push('/marketplace/mechanics/dashboard')}
        style={styles.button}
      >
        Go to Dashboard Now
      </button>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div style={styles.container}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    padding: '20px',
    color: theme.colors.text.secondary,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[10],
    maxWidth: '480px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    marginTop: theme.spacing[5],
    marginBottom: theme.spacing[3],
    color: theme.colors.text.primary,
  },
  message: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.base,
    marginBottom: theme.spacing[5],
  },
  redirect: {
    color: theme.colors.text.muted,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[6],
  },
  button: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
};