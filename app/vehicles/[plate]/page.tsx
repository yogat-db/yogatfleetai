'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Edit, ArrowLeft, Calendar, Wrench, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plate = params.plate as string;

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [motStatus, setMotStatus] = useState<{ expiry: string | null; status: string | null }>({ expiry: null, status: null });

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

      if (error) throw error;
      setVehicle(data);
      setMotStatus({ expiry: data.mot_expiry, status: data.mot_status });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this vehicle permanently?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Vehicle deleted');
      router.push('/vehicles');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleMOTCheck = () => {
    window.open(`https://www.gov.uk/check-mot-history?registration=${plate}`, '_blank');
  };

  const displayValue = (value: any, fallback = '—') => (value !== null && value !== undefined && value !== '' ? String(value) : fallback);

  if (loading) return <LoadingView />;
  if (error || !vehicle) return <ErrorView error={error} onBack={() => router.back()} />;

  const motExpiry = motStatus.expiry ? new Date(motStatus.expiry) : null;
  const isMOTExpired = motExpiry && motExpiry < new Date();
  const daysLeft = motExpiry ? Math.ceil((motExpiry.getTime() - Date.now()) / (1000 * 3600 * 24)) : null;

  return (
    <div style={styles.container}>
      <button onClick={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>{displayValue(vehicle.make)} {displayValue(vehicle.model)}</h1>
        <p style={styles.plate}>{vehicle.license_plate}</p>

        <div style={styles.detailsGrid}>
          <div><strong>Year:</strong> {displayValue(vehicle.year)}</div>
          <div><strong>Mileage:</strong> {displayValue(vehicle.mileage?.toLocaleString())} mi</div>
          <div><strong>Health:</strong> {displayValue(vehicle.health_score)}%</div>
          <div><strong>Status:</strong> {displayValue(vehicle.status, 'Active')}</div>
          {vehicle.vin && <div><strong>VIN:</strong> {vehicle.vin}</div>}
          {vehicle.fuel_type && <div><strong>Fuel:</strong> {vehicle.fuel_type}</div>}
          {vehicle.engine_capacity && <div><strong>Engine:</strong> {vehicle.engine_capacity} cc</div>}
        </div>

        {/* MOT Reminder Card */}
        {motStatus.expiry && (
          <div style={{ ...styles.motCard, background: isMOTExpired ? '#ef444420' : '#f59e0b20', borderColor: isMOTExpired ? '#ef4444' : '#f59e0b' }}>
            <AlertTriangle size={20} color={isMOTExpired ? '#ef4444' : '#f59e0b'} />
            <div>
              <strong>MOT Status:</strong> {isMOTExpired ? 'Expired' : `Valid until ${motExpiry?.toLocaleDateString()}`}
              {!isMOTExpired && daysLeft !== null && daysLeft <= 30 && <span style={{ color: '#f59e0b' }}> (Renew soon!)</span>}
            </div>
            <button onClick={handleMOTCheck} style={styles.motButton}>Check MOT History →</button>
          </div>
        )}

        <div style={styles.actions}>
          <Link href={`/vehicles/edit/${vehicle.id}`} style={styles.editButton}><Edit size={16} /> Edit</Link>
          <button onClick={handleDelete} disabled={deleting} style={styles.deleteButton}>
            {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
            {deleting ? ' Deleting...' : ' Delete'}
          </button>
          <Link href={`/service-history/add?vehicleId=${vehicle.id}`} style={styles.serviceButton}>
            <Calendar size={16} /> Log Service
          </Link>
          <Link href={`/diagnostics?vehicleId=${vehicle.id}`} style={styles.diagnosticsButton}>
            <Wrench size={16} /> Diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
}

const LoadingView = () => (
  <div style={{ padding: '60px', textAlign: 'center' }}>
    <Loader2 size={32} className="spin" />
    <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorView = ({ error, onBack }: { error?: string | null; onBack: () => void }) => (
  <div style={{ padding: '60px', textAlign: 'center' }}>
    <p style={{ color: '#ef4444' }}>{error || 'Vehicle not found'}</p>
    <button onClick={onBack} style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Go Back</button>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing[10], background: theme.colors.background.main, minHeight: '100vh', color: theme.colors.text.primary, fontFamily: theme.fontFamilies.sans },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[6], color: theme.colors.text.secondary, background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: theme.borderRadius.lg, padding: `${theme.spacing[1]} ${theme.spacing[4]}`, cursor: 'pointer' },
  card: { background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border.light}`, padding: theme.spacing[8] },
  title: { fontSize: theme.fontSizes['3xl'], fontWeight: theme.fontWeights.bold, marginBottom: theme.spacing[2] },
  plate: { fontSize: theme.fontSizes.lg, color: theme.colors.text.secondary, marginBottom: theme.spacing[6] },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: theme.spacing[4], marginBottom: theme.spacing[8] },
  motCard: { display: 'flex', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4], borderRadius: theme.borderRadius.lg, border: '1px solid', marginBottom: theme.spacing[6], flexWrap: 'wrap' },
  motButton: { marginLeft: 'auto', background: 'transparent', border: 'none', color: theme.colors.primary, cursor: 'pointer', textDecoration: 'underline' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing[4], marginTop: theme.spacing[4] },
  editButton: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], background: theme.colors.primary, color: theme.colors.background.main, padding: `${theme.spacing[2]} ${theme.spacing[4]}`, borderRadius: theme.borderRadius.lg, textDecoration: 'none', fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium },
  deleteButton: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], background: 'transparent', border: `1px solid ${theme.colors.status.critical}`, color: theme.colors.status.critical, padding: `${theme.spacing[2]} ${theme.spacing[4]}`, borderRadius: theme.borderRadius.lg, fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium, cursor: 'pointer' },
  serviceButton: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], background: theme.colors.status.info, color: '#fff', padding: `${theme.spacing[2]} ${theme.spacing[4]}`, borderRadius: theme.borderRadius.lg, textDecoration: 'none', fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium },
  diagnosticsButton: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], background: theme.colors.status.warning, color: '#020617', padding: `${theme.spacing[2]} ${theme.spacing[4]}`, borderRadius: theme.borderRadius.lg, textDecoration: 'none', fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium },
};