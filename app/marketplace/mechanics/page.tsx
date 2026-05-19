import Link from 'next/link';
import { Suspense } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  MapPin,
  Star,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Users,
} from 'lucide-react';
import theme from '@/app/theme';

type MechanicRow = {
  id: string;
  business_name: string;
  address: string | null;
  verified: boolean | null;
  subscription_status: string | null;
};

function MechanicsGridSkeleton() {
  return (
    <div style={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          style={{
            ...styles.card,
            opacity: 0.72,
            background: theme.colors.background.card,
          }}
        >
          <div style={styles.skeletonPill} />
          <div style={styles.skeletonTitle} />
          <div style={styles.skeletonLine} />
          <div style={{ ...styles.skeletonLine, width: '64%' }} />
          <div style={styles.cardFooter}>
            <div style={styles.skeletonTiny} />
            <div style={styles.skeletonTiny} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function MechanicsList() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no writes needed in this page
        },
      },
    }
  );

  const { data: mechanics, error } = await supabase
    .from('mechanics')
    .select('id, business_name, address, verified, subscription_status')
    .eq('subscription_status', 'active')
    .order('verified', { ascending: false })
    .order('business_name', { ascending: true });

  if (error) {
    console.error('Error fetching mechanics:', error);

    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={40} color={theme.colors.status.critical} />
        <h3 style={styles.stateTitle}>Unable to load mechanics</h3>
        <p style={styles.stateText}>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  if (!mechanics || mechanics.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIconWrap}>
          <Wrench size={24} color={theme.colors.primary} />
        </div>
        <h3 style={styles.stateTitle}>No active mechanics yet</h3>
        <p style={styles.stateText}>
          Check back soon. New mechanics are added regularly.
        </p>
      </div>
    );
  }

  const mechanicRows = mechanics as MechanicRow[];
  const verifiedCount = mechanicRows.filter((m) => !!m.verified).length;

  return (
    <>
      <div style={styles.summaryStrip}>
        <div style={styles.summaryCard}>
          <Users size={18} color={theme.colors.primary} />
          <div>
            <div style={styles.summaryValue}>{mechanicRows.length}</div>
            <div style={styles.summaryLabel}>Active mechanics</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <ShieldCheck size={18} color="#22c55e" />
          <div>
            <div style={styles.summaryValue}>{verifiedCount}</div>
            <div style={styles.summaryLabel}>Verified listings</div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {mechanicRows.map((mechanic) => (
          <Link
            key={mechanic.id}
            href={`/marketplace/mechanics/${mechanic.id}`}
            style={styles.linkReset}
          >
            <article style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.cardTopText}>
                  <div style={styles.directoryEyebrow}>Mechanic profile</div>
                  <h2 style={styles.businessName}>{mechanic.business_name}</h2>
                </div>

                {mechanic.verified ? (
                  <span style={styles.verifiedBadge}>
                    <CheckCircle size={14} />
                    Verified
                  </span>
                ) : (
                  <span style={styles.pendingBadge}>Unverified</span>
                )}
              </div>

              <div style={styles.metaStack}>
                <div style={styles.detail}>
                  <MapPin size={14} color={theme.colors.text.muted} />
                  <span style={styles.detailText}>
                    {mechanic.address || 'Location available on profile'}
                  </span>
                </div>

                <div style={styles.ratingRow}>
                  <div style={styles.rating}>
                    <Star size={14} color="#fbbf24" fill="#fbbf24" />
                    <span>Reviews coming soon</span>
                  </div>

                  <span style={styles.statusChip}>
                    {mechanic.subscription_status === 'active'
                      ? 'Available'
                      : 'Inactive'}
                  </span>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <span style={styles.viewLabel}>View profile</span>
                <ArrowRight size={16} color={theme.colors.primary} />
              </div>
            </article>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function MechanicsDirectoryPage() {
  return (
    <div style={styles.container}>
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroCopy}>
            <div style={styles.heroEyebrow}>Marketplace directory</div>
            <h1 style={styles.title}>Find trusted mechanics near you</h1>
            <p style={styles.subtitle}>
              Browse active mechanic profiles, check verification status, and open
              a full profile to learn more about their business.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<MechanicsGridSkeleton />}>
        <MechanicsList />
      </Suspense>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(16px, 4vw, 32px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    maxWidth: '1240px',
    margin: '0 auto',
  },
  hero: {
    marginBottom: '24px',
  },
  heroInner: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius['2xl'],
    padding: 'clamp(20px, 5vw, 32px)',
  },
  heroCopy: {
    maxWidth: '720px',
  },
  heroEyebrow: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    fontWeight: 700,
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 44px)',
    fontWeight: theme.fontWeights.bold,
    margin: '0 0 10px 0',
    color: theme.colors.text.primary,
    lineHeight: 1.05,
  },
  subtitle: {
    fontSize: '15px',
    color: theme.colors.text.secondary,
    margin: 0,
    maxWidth: '62ch',
    lineHeight: 1.6,
  },
  summaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: '14px 16px',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: theme.colors.text.primary,
    lineHeight: 1.1,
  },
  summaryLabel: {
    fontSize: '12px',
    color: theme.colors.text.muted,
    marginTop: '3px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  linkReset: {
    textDecoration: 'none',
    display: 'block',
    height: '100%',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: '18px',
    border: `1px solid ${theme.colors.border.light}`,
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '220px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '14px',
  },
  cardTopText: {
    minWidth: 0,
    flex: 1,
  },
  directoryEyebrow: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: theme.colors.text.muted,
    marginBottom: '6px',
    fontWeight: 700,
  },
  businessName: {
    fontSize: '18px',
    fontWeight: theme.fontWeights.semibold,
    margin: 0,
    color: theme.colors.text.primary,
    lineHeight: 1.25,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    padding: '6px 10px',
    borderRadius: theme.borderRadius.full,
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: `${theme.colors.status.warning}20`,
    color: theme.colors.status.warning,
    padding: '6px 10px',
    borderRadius: theme.borderRadius.full,
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  metaStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '14px',
  },
  detail: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '14px',
    color: theme.colors.text.secondary,
  },
  detailText: {
    lineHeight: 1.5,
  },
  ratingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: theme.colors.text.muted,
  },
  statusChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 9px',
    borderRadius: theme.borderRadius.full,
    background: theme.colors.background.subtle,
    color: theme.colors.text.secondary,
    fontSize: '11px',
    fontWeight: 700,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: '14px',
    borderTop: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: theme.colors.primary,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 20px',
    color: theme.colors.text.muted,
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    marginTop: '12px',
    border: `1px solid ${theme.colors.border.light}`,
  },
  emptyIconWrap: {
    width: '52px',
    height: '52px',
    margin: '0 auto 14px',
    borderRadius: '16px',
    background: `${theme.colors.primary}12`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    minHeight: '320px',
    textAlign: 'center',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: '32px 20px',
    marginTop: '12px',
    border: `1px solid ${theme.colors.border.light}`,
  },
  stateTitle: {
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: '20px',
    fontWeight: 800,
  },
  stateText: {
    color: theme.colors.text.secondary,
    margin: 0,
    maxWidth: '46ch',
    lineHeight: 1.6,
  },
  skeletonPill: {
    width: '86px',
    height: '24px',
    borderRadius: '999px',
    background: theme.colors.border.medium,
    marginBottom: '14px',
  },
  skeletonTitle: {
    height: '24px',
    width: '70%',
    background: theme.colors.border.medium,
    borderRadius: '8px',
    marginBottom: '14px',
  },
  skeletonLine: {
    height: '14px',
    width: '100%',
    background: theme.colors.border.medium,
    borderRadius: '8px',
    marginBottom: '8px',
  },
  skeletonTiny: {
    width: '92px',
    height: '12px',
    background: theme.colors.border.medium,
    borderRadius: '8px',
  },
};