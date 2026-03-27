'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, AlertCircle, CheckCircle, Loader2, Car, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
});

export default function AddVehiclePage() {
  const router = useRouter();
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasMultiVehicle, setHasMultiVehicle] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    checkLimit();
  }, []);

  async function checkLimit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Count vehicles
    const { count, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (!countError) setVehicleCount(count || 0);

    // Check multi-vehicle upgrade
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_multi_vehicle')
      .eq('id', user.id)
      .single();
    setHasMultiVehicle(profile?.has_multi_vehicle || false);
  }

  useEffect(() => {
    if (vehicleCount > 0 && !hasMultiVehicle) {
      setShowUpgrade(true);
    } else {
      setShowUpgrade(false);
    }
  }, [vehicleCount, hasMultiVehicle]);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/stripe/create-multi-vehicle-checkout', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start upgrade');
      }
    } catch (err) {
      alert('Something went wrong');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const fetchVehicleDetails = async () => {
    if (!plate.trim()) {
      setError('Please enter a licence plate');
      return;
    }
    setFetching(true);
    setError(null);
    try {
      // DVLA lookup (mock for now)
      const dvlaRes = await fetch(`/api/dvla/${plate.toUpperCase()}`);
      if (!dvlaRes.ok) {
        const err = await dvlaRes.json();
        throw new Error(err.error || 'DVLA lookup failed');
      }
      const dvlaData = await dvlaRes.json();
      setVehicleData(dvlaData);

      // MOT history (optional)
      const motRes = await fetch(`/api/mot/${plate.toUpperCase()}`);
      if (motRes.ok) {
        const motData = await motRes.json();
        // you can use it if needed
      }

      // AI insight (mock)
      setAiLoading(true);
      // simulate AI call
      setTimeout(() => {
        setAiInsight('No major issues predicted for this vehicle based on its age and mileage.');
        setAiLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleData) {
      setError('Please fetch vehicle details first');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Geocode address if provided
      let lat: number | null = null;
      let lng: number | null = null;
      if (address.trim()) {
        try {
          const response = await geocodingClient
            .forwardGeocode({
              query: address,
              limit: 1,
            })
            .send();
          if (response.body.features.length) {
            [lng, lat] = response.body.features[0].center;
          }
        } catch (geoErr) {
          console.warn('Geocoding failed:', geoErr);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error: insertError } = await supabase.from('vehicles').insert({
        license_plate: plate.toUpperCase(),
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.yearOfManufacture,
        fuel_type: vehicleData.fuelType,
        engine_capacity: vehicleData.engineCapacity,
        vin: vehicleData.vin || null,
        lat,
        lng,
        user_id: user.id,
        mileage: 0,
        status: 'active',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push('/fleet'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showUpgrade) {
    return (
      <div style={styles.page}>
        <div style={styles.upgradeCard}>
          <h1>Upgrade to Add More Vehicles</h1>
          <p>You already have one vehicle registered. To add another vehicle, upgrade for a one‑time fee of £10.</p>
          <div style={styles.upgradeActions}>
            <button onClick={handleUpgrade} disabled={upgradeLoading} style={styles.upgradeButton}>
              {upgradeLoading ? 'Processing...' : 'Upgrade Now (£10)'}
            </button>
            <button onClick={() => router.push('/fleet')} style={styles.backButton}>
              Back to Fleet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Add Vehicle</h1>
      <div style={styles.card}>
        {/* Plate lookup */}
        <div style={styles.plateInput}>
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="e.g., KF66LJN"
            style={styles.input}
            disabled={fetching}
          />
          <button
            onClick={fetchVehicleDetails}
            disabled={fetching || !plate.trim()}
            style={styles.searchButton}
          >
            <Search size={18} />
            {fetching ? 'Fetching...' : 'Look up'}
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {vehicleData && (
          <div style={styles.preview}>
            <h3>Vehicle Details</h3>
            <p><strong>Make:</strong> {vehicleData.make}</p>
            <p><strong>Model:</strong> {vehicleData.model}</p>
            <p><strong>Year:</strong> {vehicleData.yearOfManufacture}</p>
            <p><strong>Fuel:</strong> {vehicleData.fuelType}</p>
            <p><strong>Engine:</strong> {vehicleData.engineCapacity} cc</p>
            {vehicleData.vin && <p><strong>VIN:</strong> {vehicleData.vin}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Address (optional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 High Street, Leicester"
              style={styles.input}
            />
          </div>

          {aiLoading && (
            <div style={styles.aiContainer}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={styles.aiText}>Generating AI insights...</span>
            </div>
          )}
          {aiInsight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.aiContainer}
            >
              <Car size={16} style={{ color: theme.colors.primary }} />
              <span style={styles.aiText}>{aiInsight}</span>
            </motion.div>
          )}

          {success && (
            <div style={styles.successBox}>
              <CheckCircle size={16} />
              Vehicle added successfully! Redirecting...
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !vehicleData}
            style={styles.submitButton}
          >
            {loading ? 'Saving...' : 'Add Vehicle'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: theme.spacing[10], background: theme.colors.background.main, minHeight: '100vh', color: theme.colors.text.primary, fontFamily: theme.fontFamilies.sans },
  title: { fontSize: theme.fontSizes['4xl'], fontWeight: theme.fontWeights.bold, marginBottom: theme.spacing[2], background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  card: { maxWidth: 600, background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, padding: theme.spacing[6], border: `1px solid ${theme.colors.border.light}` },
  plateInput: { display: 'flex', gap: theme.spacing[3], marginBottom: theme.spacing[5] },
  input: { flex: 1, background: theme.colors.background.elevated, border: `1px solid ${theme.colors.border.medium}`, borderRadius: theme.borderRadius.lg, padding: theme.spacing[3], color: theme.colors.text.primary },
  searchButton: { background: theme.colors.primary, border: 'none', borderRadius: theme.borderRadius.lg, padding: `0 ${theme.spacing[4]}`, color: theme.colors.background.main, fontWeight: theme.fontWeights.semibold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing[1] },
  errorBox: { display: 'flex', alignItems: 'center', gap: theme.spacing[2], background: `${theme.colors.error}20`, border: `1px solid ${theme.colors.error}`, borderRadius: theme.borderRadius.lg, padding: theme.spacing[3], marginBottom: theme.spacing[4], color: theme.colors.error },
  preview: { marginTop: theme.spacing[5], padding: theme.spacing[4], background: theme.colors.background.elevated, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing[5] },
  field: { marginBottom: theme.spacing[4] },
  label: { display: 'block', marginBottom: theme.spacing[2], color: theme.colors.text.secondary },
  aiContainer: { display: 'flex', alignItems: 'center', gap: theme.spacing[2], background: theme.colors.background.elevated, borderRadius: theme.borderRadius.lg, padding: theme.spacing[3], marginBottom: theme.spacing[4] },
  aiText: { fontSize: theme.fontSizes.sm, color: theme.colors.text.secondary },
  successBox: { display: 'flex', alignItems: 'center', gap: theme.spacing[2], background: `${theme.colors.primary}20`, border: `1px solid ${theme.colors.primary}`, borderRadius: theme.borderRadius.lg, padding: theme.spacing[3], marginBottom: theme.spacing[4], color: theme.colors.primary },
  submitButton: { width: '100%', background: theme.colors.primary, border: 'none', borderRadius: theme.borderRadius.lg, padding: theme.spacing[3], fontSize: theme.fontSizes.base, fontWeight: theme.fontWeights.semibold, color: theme.colors.background.main, cursor: 'pointer', marginTop: theme.spacing[2] },
  upgradeCard: { maxWidth: 500, margin: '0 auto', background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, padding: theme.spacing[8], textAlign: 'center' },
  upgradeActions: { display: 'flex', gap: theme.spacing[3], justifyContent: 'center', marginTop: theme.spacing[6] },
  upgradeButton: { background: theme.colors.primary, border: 'none', borderRadius: theme.borderRadius.lg, padding: `${theme.spacing[2]} ${theme.spacing[5]}`, color: theme.colors.background.main, fontWeight: theme.fontWeights.semibold, cursor: 'pointer' },
  backButton: { background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: theme.borderRadius.lg, padding: `${theme.spacing[2]} ${theme.spacing[5]}`, color: theme.colors.text.secondary, cursor: 'pointer' },
};