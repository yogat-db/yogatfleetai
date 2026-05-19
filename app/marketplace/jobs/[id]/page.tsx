import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  PoundSterling,
  Gauge,
  MapPin,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import theme from '@/app/theme';

type JobStatus = 'open' | 'in_progress' | 'assigned' | 'completed' | 'cancelled' | string;

type JobPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type JobRecord = {
  id: string;
  title: string | null;
  description: string | null;
  budget: number | null;
  location: string | null;
  status: JobStatus | null;
  urgency: string | null;
  category: string | null;
  created_at: string | null;
  lat: number | null;
  lng: number | null;
  vehicle_id: string | null;
  vehicles:
    | {
        id: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel_type: string | null;
        license_plate: string | null;
      }
    | {
        id: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel_type: string | null;
        license_plate: string | null;
      }[]
    | null;
};

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'Budget not specified';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatLabel(value: string | null | undefined, fallback = 'Not specified') {
  if (!value) return fallback;
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status: JobStatus | null) {
  const normalized = (status ?? '').toLowerCase();

  if (normalized === 'completed') {
    return {
      bg: 'rgba(34, 197, 94, 0.14)',
      border: 'rgba(34, 197, 94, 0.28)',
      color: '#4ade80',
      label: 'Completed',
    };
  }

  if (normalized === 'assigned' || normalized === 'in_progress') {
    return {
      bg: 'rgba(59, 130, 246, 0.14)',
      border: 'rgba(59, 130, 246, 0.28)',
      color: '#60a5fa',
      label: formatLabel(status),
    };
  }

  if (normalized === 'cancelled') {
    return {
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(239, 68, 68, 0.28)',
      color: '#f87171',
      label: 'Cancelled',
    };
  }

  return {
    bg: 'rgba(250, 204, 21, 0.14)',
    border: 'rgba(250, 204, 21, 0.28)',
    color: '#facc15',
    label: 'Open',
  };
}

function getUrgencyTone(urgency: string | null) {
  const normalized = (urgency ?? '').toLowerCase();

  if (normalized === 'immediate') {
    return {
      bg: 'rgba(239, 68, 68, 0.10)',
      border: 'rgba(239, 68, 68, 0.24)',
      color: '#f87171',
    };
  }

  if (normalized === 'week') {
    return {
      bg: 'rgba(250, 204, 21, 0.10)',
      border: 'rgba(250, 204, 21, 0.24)',
      color: '#facc15',
    };
  }

  return {
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.24)',
    color: '#4ade80',
  };
}

export default async function JobDetailsPage({ params }: JobPageProps) {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(
      `
        id,
        title,
        description,
        budget,
        location,
        status,
        urgency,
        category,
        created_at,
        lat,
        lng,
        vehicle_id,
        vehicles (
          id,
          make,
          model,
          year,
          fuel_type,
          license_plate
        )
      `
    )
    .eq('id', id)
    .single<JobRecord>();

  if (error || !data) {
    notFound();
  }

  const vehicle = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;
  const statusTone = getStatusTone(data.status);
  const urgencyTone = getUrgencyTone(data.urgency);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <Link href="/marketplace/jobs" style={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back to jobs</span>
          </Link>
        </div>

        <section style={styles.heroCard}>
          <div style={styles.heroHeader}>
            <div style={styles.heroCopy}>
              <div style={styles.badgeRow}>
                <span
                  style={{
                    ...styles.badge,
                    background: statusTone.bg,
                    border: `1px solid ${statusTone.border}`,
                    color: statusTone.color,
                  }}
                >
                  <ShieldCheck size={13} />
                  {statusTone.label}
                </span>

                {data.category && (
                  <span style={styles.secondaryBadge}>
                    <Wrench size={13} />
                    {data.category}
                  </span>
                )}

                <span
                  style={{
                    ...styles.secondaryBadge,
                    background: urgencyTone.bg,
                    border: `1px solid ${urgencyTone.border}`,
                    color: urgencyTone.color,
                  }}
                >
                  <Gauge size={13} />
                  {formatLabel(data.urgency)}
                </span>
              </div>

              <h1 style={styles.title}>{data.title || 'Untitled job'}</h1>

              <p style={styles.subtitle}>
                Posted {formatDate(data.created_at)}. Review the job scope, attached vehicle, budget,
                and location before assigning or quoting.
              </p>
            </div>

            <div style={styles.priceCard}>
              <span style={styles.priceLabel}>Budget</span>
              <strong style={styles.priceValue}>{formatCurrency(data.budget)}</strong>
            </div>
          </div>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <CalendarClock size={16} color={theme.colors.primary} />
              <div>
                <span style={styles.metaLabel}>Posted</span>
                <p style={styles.metaValue}>{formatDate(data.created_at)}</p>
              </div>
            </div>

            <div style={styles.metaCard}>
              <MapPin size={16} color={theme.colors.primary} />
              <div>
                <span style={styles.metaLabel}>Location</span>
                <p style={styles.metaValue}>{data.location || 'No location provided'}</p>
              </div>
            </div>

            <div style={styles.metaCard}>
              <PoundSterling size={16} color={theme.colors.primary} />
              <div>
                <span style={styles.metaLabel}>Pricing</span>
                <p style={styles.metaValue}>{formatCurrency(data.budget)}</p>
              </div>
            </div>

            <div style={styles.metaCard}>
              <Gauge size={16} color={theme.colors.primary} />
              <div>
                <span style={styles.metaLabel}>Urgency</span>
                <p style={styles.metaValue}>{formatLabel(data.urgency)}</p>
              </div>
            </div>
          </div>
        </section>

        <div style={styles.layout}>
          <section style={styles.mainCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Job description</h2>
            </div>

            <div style={styles.descriptionBox}>
              <p style={styles.descriptionText}>
                {data.description?.trim() || 'No job description was provided.'}
              </p>
            </div>

            {(data.lat !== null && data.lng !== null) && (
              <div style={styles.coordinatesCard}>
                <MapPin size={14} color={theme.colors.primary} />
                <span style={styles.coordinatesText}>
                  Coordinates: {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
                </span>
              </div>
            )}
          </section>

          <aside style={styles.sidebar}>
            <section style={styles.sideCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Vehicle</h2>
              </div>

              {vehicle ? (
                <div style={styles.vehicleCard}>
                  <div style={styles.vehicleHeader}>
                    <div style={styles.vehicleIconWrap}>
                      <CarFront size={18} color={theme.colors.primary} />
                    </div>
                    <div>
                      <p style={styles.vehicleTitle}>
                        {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle attached'}
                      </p>
                      <p style={styles.vehiclePlate}>
                        {vehicle.license_plate || 'Plate not available'}
                      </p>
                    </div>
                  </div>

                  <div style={styles.vehicleMetaList}>
                    <div style={styles.vehicleMetaItem}>
                      <span style={styles.vehicleMetaLabel}>Year</span>
                      <span style={styles.vehicleMetaValue}>
                        {vehicle.year ?? 'Unknown'}
                      </span>
                    </div>

                    <div style={styles.vehicleMetaItem}>
                      <span style={styles.vehicleMetaLabel}>Fuel</span>
                      <span style={styles.vehicleMetaValue}>
                        {vehicle.fuel_type || 'Unknown'}
                      </span>
                    </div>

                    <div style={styles.vehicleMetaItem}>
                      <span style={styles.vehicleMetaLabel}>Vehicle ID</span>
                      <span style={styles.vehicleMetaValue}>{vehicle.id}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.emptyBlock}>
                  <p style={styles.emptyText}>No linked vehicle found for this job.</p>
                </div>
              )}
            </section>

            <section style={styles.sideCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Actions</h2>
              </div>

              <div style={styles.actionStack}>
                <Link href="/marketplace/jobs" style={styles.secondaryButton}>
                  Back to jobs
                </Link>

                {vehicle?.id && (
                  <Link href={`/fleet/${vehicle.id}`} style={styles.primaryButton}>
                    View vehicle
                  </Link>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    padding: '24px 16px 40px',
    color: theme.colors.text.primary,
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  topBar: {
    marginBottom: 16,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: theme.colors.text.secondary,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
  heroCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  heroCopy: {
    flex: '1 1 640px',
  },
  badgeRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  secondaryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.secondary,
  },
  title: {
    margin: 0,
    fontSize: 'clamp(30px, 4vw, 42px)',
    lineHeight: 1.06,
    fontWeight: 850,
    letterSpacing: '-0.05em',
  },
  subtitle: {
    marginTop: 12,
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 760,
  },
  priceCard: {
    minWidth: 220,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 20,
    padding: 18,
    height: 'fit-content',
  },
  priceLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 28,
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  metaCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  metaLabel: {
    display: 'block',
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  },
  metaValue: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: theme.colors.text.primary,
    wordBreak: 'break-word',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)',
    gap: 20,
  },
  mainCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 20,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sideCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.15,
    fontWeight: 750,
    letterSpacing: '-0.03em',
  },
  descriptionBox: {
    borderRadius: 18,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    padding: 16,
  },
  descriptionText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.8,
    color: theme.colors.text.primary,
    whiteSpace: 'pre-wrap',
  },
  coordinatesCard: {
    marginTop: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 14,
    background: `${theme.colors.primary}10`,
    border: `1px solid ${theme.colors.primary}22`,
  },
  coordinatesText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  vehicleCard: {
    borderRadius: 18,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    padding: 16,
  },
  vehicleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  vehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${theme.colors.primary}12`,
  },
  vehicleTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  vehiclePlate: {
    margin: '4px 0 0',
    fontSize: 13,
    color: theme.colors.text.secondary,
    letterSpacing: '0.06em',
  },
  vehicleMetaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  vehicleMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    paddingBottom: 10,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  vehicleMetaLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  vehicleMetaValue: {
    fontSize: 13,
    color: theme.colors.text.primary,
    textAlign: 'right',
    wordBreak: 'break-word',
  },
  emptyBlock: {
    borderRadius: 18,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    padding: 16,
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  actionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 800,
    background: theme.colors.primary,
    color: '#020617',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 700,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.primary,
  },
};
