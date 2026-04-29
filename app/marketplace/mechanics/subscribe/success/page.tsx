'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function SubscribeSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function confirmSubscription() {
      if (!sessionId) {
        setStatus('error');
        setMessage('No session ID found');
        return;
      }

      // Verify the session is still active
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Try to refresh session
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          setStatus('error');
          setMessage('You have been logged out. Please log in again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
      }

      // Optionally call your webhook or confirm subscription status from Stripe
      setStatus('success');
      setMessage('Subscription activated! Redirecting to dashboard...');
      setTimeout(() => router.push('/marketplace/mechanics/dashboard'), 2000);
    }

    confirmSubscription();
  }, [sessionId, router]);

  return (
    <div style={styles.container}>
      {status === 'loading' && <p>Confirming your subscription...</p>}
      {status === 'success' && <p style={{ color: theme.colors.primary }}>{message}</p>}
      {status === 'error' && <p style={{ color: theme.colors.status.critical }}>{message}</p>}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: theme.fontFamilies.sans,
  },
};