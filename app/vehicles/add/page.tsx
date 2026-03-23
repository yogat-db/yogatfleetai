'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Search, AlertCircle, CheckCircle, Loader2, Car, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

// Geocoding client (uses your Mapbox token)
const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
});

export default function AddVehiclePage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [address, setAddress] = useState('');

  // Fetch DVLA + MOT + AI insights
  const fetchVehicleDetails = async () => {
    if (!plate.trim()) {
      setError('Please enter a licence plate');
      return;
    }
    setFetching(true);
    setError(null);
    try {
      // DVLA
      const dvlaRes = await fetch(`/api/dvla/${plate.toUpperCase()}`);
      if (!dvlaRes.ok) {
        const err = await dvlaRes.json();
        throw new Error(err.error || 'DVLA lookup failed');
      }
      const dvlaData = await dvlaRes.json();
      setValue('make', dvlaData.make);
      setValue('model', dvlaData.model);
      setValue('year', dvlaData.yearOfManufacture);
      setValue('fuelType', dvlaData.fuelType);
      setValue('engineCapacity', dvlaData.engineCapacity);
      setValue('vin', dvlaData.vin || '');

      // MOT history (optional)
      const motRes = await fetch(`/api/mot/${plate.toUpperCase()}`);
      if (motRes.ok) {
        const motData = await motRes.json();
        // You can display MOT data if needed
      }

      // AI insight
      setAiLoading(true);
      const aiRes = await fetch('/api/ai/vehicle-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: dvlaData.make,
          model: dvlaData.model,
          year: dvlaData.yearOfManufacture,
          engine: dvlaData.engineCapacity,
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiInsight(aiData.insight);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
      setAiLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Insert vehicle
      const { error: insertError } = await supabase.from('vehicles').insert({
        license_plate: plate.toUpperCase(),
        make: data.make,
        model: data.model,
        year: data.year,
        fuel_type: data.fuelType,
        engine_capacity: data.engineCapacity,
        vin: data.vin || null,
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

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Vehicle fields (populated from DVLA) */}
          <div style={styles.field}>
            <label style={styles.label}>Make *</label>
            <input {...register('make')} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Model *</label>
            <input {...register('model')} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Year *</label>
            <input {...register('year')} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Fuel Type *</label>
            <input {...register('fuelType')} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Engine Capacity (cc) *</label>
            <input {...register('engineCapacity')} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>VIN (Optional)</label>
            <input {...register('vin')} style={styles.input} placeholder="Optional" />
          </div>

          {/* Address field for geocoding */}
          <div style={styles.field}>
            <label style={styles.label}>
              <MapPin size={14} style={{ marginRight: '4px' }} />
              Address (optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 High Street, Leicester"
              style={styles.input}
            />
          </div>

          {/* AI insight */}
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
            disabled={loading || !plate}
            style={styles.submitButton}
          >
            {loading ? 'Saving...' : 'Add Vehicle'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 24, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  card: { maxWidth: 600, background: '#0f172a', borderRadius: 16, padding: 24, border: '1px solid #1e293b' },
  plateInput: { display: 'flex', gap: 12, marginBottom: 20 },
  input: { flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12, color: '#f1f5f9', fontSize: 16, outline: 'none' },
  searchButton: { background: '#22c55e', border: 'none', borderRadius: 8, padding: '0 16px', color: '#020617', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: 14 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 20, color: '#ef4444' },
  successBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, padding: 12, marginBottom: 20, color: '#22c55e' },
  aiContainer: { display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 16 },
  aiText: { fontSize: 14, color: '#cbd5e1' },
  submitButton: { width: '100%', background: '#22c55e', border: 'none', borderRadius: 8, padding: 12, fontSize: 16, fontWeight: 600, color: '#020617', cursor: 'pointer', marginTop: 8 },
};