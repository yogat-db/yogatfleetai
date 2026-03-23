import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Phone, Star, CheckCircle, AlertCircle } from 'lucide-react';
import theme from '@/app/theme';

interface Mechanic {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  subscription_status: string;
  created_at: string;
}

export default async function MechanicDetailPage({
  params,
}: {
  params: Promise<{ mechanicId: string }>;
}) {
  const { mechanicId } = await params;
  let supabase;
  try {
    supabase = createClient();
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    notFound();
  }

  const { data: mechanic, error } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanicId)
    .maybeSingle();

  if (error || !mechanic) {
    console.error('Mechanic fetch error:', error);
    notFound();
  }

  if (mechanic.subscription_status !== 'active') {
    notFound();
  }

  return (
    <div style={styles.container}>
      <Link href="/marketplace/mechanics" style={styles.backLink}>
        ← Back to Directory
      </Link>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.name}>{mechanic.business_name}</h1>
          {mechanic.verified ? (
            <span style={styles.verifiedBadge}>
              <CheckCircle size={14} style={{ marginRight: '4px' }} />
              Verified
            </span>
          ) : (
            <span style={styles.unverifiedBadge}>
              <AlertCircle size={14} style={{ marginRight: '4px' }} />
              Unverified
            </span>
          )}
        </div>

        {mechanic.address && (
          <div style={styles.detail}>
            <MapPin size={18} color={theme.colors.text.muted} />
            <span>{mechanic.address}</span>
          </div>
        )}

        {mechanic.phone && (
          <div style={styles.detail}>
            <Phone size={18} color={theme.colors.text.muted} />
            <a href={`tel:${mechanic.phone}`} style={styles.phoneLink}>
              {mechanic.phone}
            </a>
          </div>
        )}

        <div style={styles.meta}>
          <span style={styles.metaItem}>
            <Star size={14} color="#fbbf24" fill="#fbbf24" />
            Rating: Coming soon
          </span>
          <span style={styles.metaItem}>
            Member since: {new Date(mechanic.created_at).toLocaleDateString()}
          </span>
        </div>

        <button style={styles.contactButton}>Contact Mechanic</button>
      </div>
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
  backLink: {
    display: 'inline-block',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    textDecoration: 'none',
    transition: 'background 0.2s ease',
    marginBottom: theme.spacing[6],
  },
  card: {
    maxWidth: '600px',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  name: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    margin: 0,
    color: theme.colors.text.primary,
  },
  verifiedBadge: {
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.sm,
    display: 'inline-flex',
    alignItems: 'center',
  },
  unverifiedBadge: {
    background: `${theme.colors.error}20`,
    color: theme.colors.error,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.sm,
    display: 'inline-flex',
    alignItems: 'center',
  },
  detail: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.secondary,
  },
  phoneLink: {
    color: theme.colors.text.primary,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  meta: {
    display: 'flex',
    gap: theme.spacing[4],
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[8],
    paddingTop: theme.spacing[4],
    borderTop: `1px solid ${theme.colors.border.light}`,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
  },
  contactButton: {
    width: '100%',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.background.main,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
};