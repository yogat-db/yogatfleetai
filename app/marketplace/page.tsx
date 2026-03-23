'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, Shield, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function MarketplacePage() {
  const router = useRouter();
  const [isMechanic, setIsMechanic] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMechanic = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsMechanic(!!mechanic);
      }
      setLoading(false);
    };
    checkMechanic();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Marketplace</h1>
      <p style={styles.subtitle}>Everything you need to keep your vehicle on the road</p>

      <div style={styles.grid}>
        {/* Repair Jobs */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.card}
          onClick={() => router.push('/marketplace/jobs')}
        >
          <Briefcase size={32} color={theme.colors.primary} />
          <h2>Repair Jobs</h2>
          <p>Post a repair job or find work</p>
        </motion.div>

        {/* Breakdown Cover */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.card}
          onClick={() => router.push('/marketplace/breakdown-cover')}
        >
          <Shield size={32} color={theme.colors.primary} />
          <h2>Breakdown Cover</h2>
          <p>Compare roadside assistance plans</p>
        </motion.div>

        {/* Mechanic Dashboard (only for mechanics) */}
        {!loading && isMechanic && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={styles.card}
            onClick={() => router.push('/marketplace/mechanics/dashboard')}
          >
            <LayoutDashboard size={32} color={theme.colors.primary} />
            <h2>Mechanic Dashboard</h2>
            <p>View your applications, earnings, and manage your profile</p>
          </motion.div>
        )}
      </div>
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
    marginBottom: theme.spacing[2],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[8],
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: theme.spacing[6],
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'box-shadow 0.2s ease',
  },
};