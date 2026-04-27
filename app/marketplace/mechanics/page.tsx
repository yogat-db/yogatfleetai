// app/marketplace/mechanics/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Star, CheckCircle, AlertCircle } from 'lucide-react';
import theme from '@/app/theme';

interface Mechanic {
  id: string;
  business_name: string;
  address: string | null;
  verified: boolean;
  subscription_status: string;
}

// Loading skeleton component
function MechanicsGridSkeleton() {
  return (
    <div style={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} style={{ ...styles.card, opacity: 0.5, background: theme.colors.background.subtle }}>
          <div style={{ height: '24px', background: theme.colors.border.medium, borderRadius: '4px', marginBottom: '12px' }} />
          <div style={{ height: '16px', width: '70%', background: theme.colors.border.medium, borderRadius: '4px' }} />
        </div>
      ))}
    </div>
  );
}

async function MechanicsList() {
  const supabase = await createClient();
  const { data: mechanics, error } = await supabase
    .from('mechanics')
    .select('id, business_name, address, verified, subscription_status')
    .eq('subscription_status', 'active')
    .order('business_name', { ascending: true });

  if (error) {
    console.error('Error fetching mechanics:', error);
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={40} color={theme.colors.status.critical} />
        <h3>Unable to load mechanics</h3>
        <p style={{ color: theme.colors.text.secondary }}>Please refresh the page or try again later.</p>
      </div>
    );
  }

  if (!mechanics || mechanics.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No active mechanics at the moment. Check back soon!</p>
        <p style={{ fontSize: theme.fontSizes.sm, marginTop: theme.spacing[2] }}>
          New mechanics are added regularly.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {mechanics.map((mechanic) => (
        <Link
          key={mechanic.id}
          href={`/marketplace/mechanics/${mechanic.id}`}
          style={{ textDecoration: 'none' }}
        >
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.businessName}>{mechanic.business_name}</h2>
              {mechanic.verified && (
                <span style={styles.verifiedBadge}>
                  <CheckCircle size={14} />
                  Verified
                </span>
              )}
            </div>
            {mechanic.address && (
              <div style={styles.detail}>
                <MapPin size={14} color={theme.colors.text.muted} />
                <span>{mechanic.address}</span>
              </div>
            )}
            <div style={styles.rating}>
              <Star size={14} color="#fbbf24" fill="#fbbf24" />
              <span>Reviews coming soon</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function MechanicsDirectoryPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mechanics Directory</h1>
      <p style={styles.subtitle}>Find trusted, verified mechanics near you</p>

      <Suspense fallback={<MechanicsGridSkeleton />}>
        <MechanicsList />
      </Suspense>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: theme.spacing[6],
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    border: `1px solid ${theme.colors.border.light}`,
    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  businessName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    margin: 0,
    color: theme.colors.text.primary,
    lineHeight: 1.3,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    padding: `${theme.spacing[0]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    whiteSpace: 'nowrap',
  },
  detail: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[2],
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: 'auto',
    paddingTop: theme.spacing[2],
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    marginTop: theme.spacing[8],
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[3],
    minHeight: '400px',
    textAlign: 'center',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[10],
    marginTop: theme.spacing[8],
  },
};