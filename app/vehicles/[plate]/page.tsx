// app/vehicles/[plate]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Edit, ArrowLeft, Calendar, Wrench, Trash2, Loader2 } from 'lucide-react';
import theme from '@/app/theme';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plate = params.plate as string;

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!plate) return;
    fetchVehicle();
  }, [plate]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('license_plate', plate.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Vehicle not found');
        } else {
          throw error;
        }
      } else {
        setVehicle(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      router.push('/vehicles');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const displayValue = (value: any, fallback = '—') =>
    value !== null && value !== undefined && value !== '' ? String(value) : fallback;

  if (loading) {
    return (
      <div style={styles.container}>
        <div className="spinner" />
        <p>Loading vehicle details...</p>
        <style>{`
          .spinner {
            border: 2px solid ${theme.colors.border.medium};
            border-top: 2px solid ${theme.colors.primary};
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div style={styles.container}>
        <h2>Vehicle not found</h2>
        <p>{error || 'No vehicle with that registration plate'}</p>
        <button onClick={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>
          {displayValue(vehicle.make)} {displayValue(vehicle.model)}
        </h1>
        <p style={styles.plate}>{vehicle.license_plate}</p>

        <div style={styles.detailsGrid}>
          <div><strong>Year:</strong> {displayValue(vehicle.year)}</div>
          <div><strong>Mileage:</strong> {displayValue(vehicle.mileage?.toLocaleString())} mi</div>
          <div><strong>Status:</strong> {displayValue(vehicle.status, 'Active')}</div>
          <div><strong>Health Score:</strong> {displayValue(vehicle.health_score)}%</div>
          {vehicle.vin && <div><strong>VIN:</strong> {vehicle.vin}</div>}
          {vehicle.fuel_type && <div><strong>Fuel:</strong> {vehicle.fuel_type}</div>}
          {vehicle.engine_capacity && <div><strong>Engine:</strong> {vehicle.engine_capacity} cc</div>}
        </div>

        <div style={styles.actions}>
          <Link href={`/vehicles/edit/${vehicle.id}`} style={styles.editButton}>
            <Edit size={16} /> Edit Vehicle
          </Link>
          <button onClick={handleDelete} disabled={deleting} style={styles.deleteButton}>
            {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
            {deleting ? ' Deleting...' : ' Delete Vehicle'}
          </button>
          <Link href={`/service-history/add?vehicleId=${vehicle.id}`} style={styles.serviceButton}>
            <Calendar size={16} /> Log Service
          </Link>
          <Link href={`/diagnostics?vehicleId=${vehicle.id}`} style={styles.diagnosticsButton}>
            <Wrench size={16} /> Diagnostics
          </Link>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[6],
    color: theme.colors.text.secondary,
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[1]} ${theme.spacing[4]}`,
    cursor: 'pointer',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
  },
  plate: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[6],
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
    marginTop: theme.spacing[4],
  },
  editButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.primary,
    color: theme.colors.background.main,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.lg,
    textDecoration: 'none',
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: 'transparent',
    border: `1px solid ${theme.colors.status.critical}`,
    color: theme.colors.status.critical,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    cursor: 'pointer',
  },
  serviceButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.status.info,
    color: '#fff',
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.lg,
    textDecoration: 'none',
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
  diagnosticsButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.status.warning,
    color: '#020617',
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.lg,
    textDecoration: 'none',
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
};