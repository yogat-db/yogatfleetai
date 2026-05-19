'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Edit,
  Loader2,
  Trash2,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

type Vehicle = {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  status: string | null;
  health_score: number | null;
  vin?: string | null;
  fuel_type?: string | null;
  engine_capacity?: number | null;
  mot_expiry: string | null;
  mot_status: 'valid' | 'expired' | 'unknown' | null;
};

type MotState = {
  expiry: string | null;
  status: 'valid' | 'expired' | 'unknown' | null;
};

export default function VehicleDetailPage() {
  const params = useParams<{ plate: string | string[] }>();
  const router = useRouter();
  const plateParam = Array.isArray(params.plate) ? params.plate[0] : params.plate;
  const plate = plateParam?.toUpperCase() ?? '';

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [motStatus, setMotStatus] = useState<MotState>({
    expiry: null,
    status: 'unknown',
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plate) return;
    void fetchVehicle();
  }, [plate]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('vehicles')
        .select(
          'id, license_plate, make, model, year, mileage, status, health_score, vin, fuel_type, engine_capacity, mot_expiry, mot_status'
        )
        .eq('license_plate', plate)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('Vehicle not found');
        setVehicle(null);
        return;
      }

      setVehicle(data as Vehicle);
      setMotStatus({
        expiry: data.mot_expiry,
        status: data.mot_status ?? 'unknown',
      });
    } catch (err) {
      console.error('Fetch vehicle error:', err);
      setError('Unable to load vehicle details. Please try again.');
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle || deleting) return;

    const confirmed = window.confirm(
      `Delete ${vehicle.license_plate} and its related data?`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `/api/vehicles/${encodeURIComponent(vehicle.id)}`,
        { method: 'DELETE' }
      );

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || 'Failed to delete vehicle');
      }

      toast.success('Vehicle deleted');
      router.push('/vehicles');
      router.refresh();
    } catch (err) {
      console.error('Delete vehicle error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete vehicle'
      );
      setDeleting(false);
    }
  };

  const handleMOTCheck = () => {
    if (!plate) return;

    window.open(
      `https://www.gov.uk/check-mot-history?registration=${encodeURIComponent(plate)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const displayValue = (value: unknown, fallback = '—') =>
    value !== null && value !== undefined && value !== ''
      ? String(value)
      : fallback;

  const motComputed = useMemo(() => {
    if (!motStatus.expiry) {
      return {
        hasMOT: false,
        isExpired: false,
        daysLeft: null as number | null,
        label: 'MOT status unknown',
      };
    }

    const expiry = new Date(motStatus.expiry);
    const now = new Date();
    const isExpired = expiry < now;
    const daysLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      hasMOT: true,
      isExpired,
      daysLeft,
      label: isExpired
        ? 'MOT expired'
        : `MOT valid until ${expiry.toLocaleDateString()}`,
    };
  }, [motStatus.expiry]);

  if (loading) {
    return <LoadingView />;
  }

  if (!vehicle || error) {
    return (
      <ErrorView
        message={error ?? 'Vehicle not found'}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <main style={styles.container}>
      <button
        type="button"
        onClick={() => router.back()}
        style={styles.backButton}
      >
        <ArrowLeft size={14} />
        <span>Back to fleet</span>
      </button>

      <section style={styles.card} aria-label="Vehicle details">
        <header style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>
              {displayValue(vehicle.make)} {displayValue(vehicle.model)}
            </h1>
            <p style={styles.plate}>{vehicle.license_plate}</p>
          </div>
          <span style={styles.statusPill}>
            {displayValue(vehicle.status ?? 'Active')}
          </span>
        </header>

        <section aria-label="Specification" style={styles.detailsGrid}>
          <DetailItem label="Year" value={displayValue(vehicle.year)} />
          <DetailItem
            label="Mileage"
            value={
              vehicle.mileage != null
                ? `${vehicle.mileage.toLocaleString()} mi`
                : '—'
            }
          />
          <DetailItem
            label="Health score"
            value={
              vehicle.health_score != null ? `${vehicle.health_score}%` : '—'
            }
          />
          <DetailItem label="VIN" value={displayValue(vehicle.vin)} />
          <DetailItem label="Fuel" value={displayValue(vehicle.fuel_type)} />
          <DetailItem
            label="Engine"
            value={
              vehicle.engine_capacity != null
                ? `${vehicle.engine_capacity} cc`
                : '—'
            }
          />
        </section>

        {motComputed.hasMOT && (
          <section
            aria-label="MOT status"
            style={{
              ...styles.motCard,
              backgroundColor: motComputed.isExpired ? '#fee2e2' : '#fef3c7',
              borderColor: motComputed.isExpired ? '#ef4444' : '#f59e0b',
            }}
          >
            <AlertTriangle
              size={18}
              color={motComputed.isExpired ? '#b91c1c' : '#b45309'}
            />
            <div style={styles.motText}>
              <p style={styles.motLabel}>{motComputed.label}</p>
              {!motComputed.isExpired &&
                motComputed.daysLeft !== null &&
                motComputed.daysLeft <= 30 && (
                  <p style={styles.motHint}>
                    Due in {motComputed.daysLeft} days – plan a booking.
                  </p>
                )}
            </div>
            <button
              type="button"
              onClick={handleMOTCheck}
              style={styles.motButton}
            >
              Check MOT history
            </button>
          </section>
        )}

        <section aria-label="Actions" style={styles.actions}>
          <Link
            href={`/vehicles/edit/${vehicle.id}`}
            style={styles.primaryButton}
          >
            <Edit size={14} />
            <span>Edit vehicle</span>
          </Link>

          <Link
            href={`/service-history/add?vehicleId=${vehicle.id}`}
            style={styles.secondaryButton}
          >
            <Calendar size={14} />
            <span>Log service</span>
          </Link>

          <Link
            href={`/diagnostics?vehicleId=${vehicle.id}`}
            style={styles.secondaryButton}
          >
            <Wrench size={14} />
            <span>Diagnostics</span>
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={styles.dangerButton}
          >
            {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
            <span>{deleting ? 'Deleting…' : 'Delete vehicle'}</span>
          </button>
        </section>
      </section>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p style={styles.detailLabel}>{label}</p>
      <p style={styles.detailValue}>{value}</p>
    </div>
  );
}

function LoadingView() {
  return (
    <main style={styles.loadingContainer}>
      <Loader2 size={30} className="spin" />
      <p style={styles.loadingLabel}>Loading vehicle…</p>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

function ErrorView({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <main style={styles.loadingContainer}>
      <p style={styles.errorText}>{message}</p>
      <button
        type="button"
        onClick={onBack}
        style={styles.errorBackButton}
      >
        <ArrowLeft size={14} />
        <span>Go back</span>
      </button>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px 32px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    maxWidth: 960,
    marginInline: 'auto',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.medium}`,
    background: 'transparent',
    color: theme.colors.text.secondary,
    fontSize: 13,
    cursor: 'pointer',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 20,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  plate: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusPill: {
    alignSelf: 'flex-start',
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.secondary,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
  },
  motCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    border: '1px solid',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  motText: {
    flex: 1,
    minWidth: 180,
  },
  motLabel: {
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
  },
  motHint: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 0,
  },
  motButton: {
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    padding: '6px 10px',
    fontSize: 12,
    background: theme.colors.background.main,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.status.critical}`,
    background: 'transparent',
    color: theme.colors.status.critical,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  loadingContainer: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    margin: 0,
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 12,
  },
  errorBackButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
    cursor: 'pointer',
    fontSize: 13,
  },
};