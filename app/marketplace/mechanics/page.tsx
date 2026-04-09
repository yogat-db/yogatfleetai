// app/marketplace/mechanics/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Star, CheckCircle } from 'lucide-react';
import theme from '@/app/theme';

interface Mechanic {
  id: string;
  business_name: string;
  address: string | null;
  verified: boolean;
  subscription_status: string;
}

export default async function MechanicsDirectoryPage() {
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
        <p>Failed to load mechanics directory. Please try again later.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mechanics Directory</h1>
      <p style={styles.subtitle}>Find trusted mechanics near you</p>

      {mechanics?.length === 0 ? (
        <div style={styles.emptyState}>No mechanics available at the moment.</div>
      ) : (
        <div style={styles.grid}>
          {mechanics?.map((mechanic) => (
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
                  <span>Rating: Coming soon</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  businessName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    margin: 0,
    color: theme.colors.text.primary,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    padding: `${theme.spacing[0.5]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
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
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    color: theme.colors.error,
  },
};