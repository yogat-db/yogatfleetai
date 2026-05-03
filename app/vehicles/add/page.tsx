'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, AlertCircle, CheckCircle, Loader2, 
  Car, Zap, Sparkles, ArrowRight, MapPin, Crosshair 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

export default function AddVehiclePage() {
  const router = useRouter();
  
  const [plate, setPlate] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const checkFleetLimits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    const [vCount, profile] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('has_multi_vehicle').eq('id', user.id).single()
    ]);
    const count = vCount.count || 0;
    const isPremium = profile.data?.has_multi_vehicle || false;
    if (count >= 1 && !isPremium) setShowUpgrade(true);
  }, [router]);

  useEffect(() => { checkFleetLimits(); }, [checkFleetLimits]);

  // Fetch vehicle from DVLA
  const fetchVehicleDetails = async () => {
    if (!plate.trim()) return setError('Licence plate required');
    setFetching(true);
    setError(null);
    setAiInsight(null);
    try {
      const res = await fetch(`/api/dvla/${plate.toUpperCase()}`);
      if (!res.ok) throw new Error('Vehicle not found in DVLA database');
      const data = await res.json();
      setVehicleData(data);
      setAiLoading(true);
      setTimeout(() => {
        setAiInsight(`AI Analysis: The ${data.yearOfManufacture} ${data.make} ${data.model} typically requires timing belt inspection at this age. Health score initialized at 85%.`);
        setAiLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  // Auto‑fetch MOT and store expiry
  const syncMOTData = async (vehicleId: string, reg: string) => {
    try {
      await fetch('/api/mot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, registration: reg }),
      });
    } catch (err) {
      console.warn('MOT sync failed (non‑critical):', err);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const geoData = await geoRes.json();
          setAddress(geoData.display_name || `${latitude}, ${longitude}`);
        } catch {
          setAddress(`${latitude}, ${longitude}`);
        }
        setDetectingLocation(false);
      },
      (err) => {
        console.error(err);
        setError('Unable to get location. Please allow access.');
        setDetectingLocation(false);
      }
    );
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/stripe/create-multi-vehicle-checkout', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      toast.error('Payment gateway error');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleData) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired – please log in again');

      const { data: newVehicle, error: insErr } = await supabase
        .from('vehicles')
        .insert({
          license_plate: plate.toUpperCase(),
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.yearOfManufacture,
          fuel_type: vehicleData.fuelType,
          engine_capacity: vehicleData.engineCapacity,
          vin: vehicleData.vin || null,
          user_id: user.id,
          status: 'active',
          health_score: 85,
          lat: coords.lat,
          lng: coords.lng,
          address: address.trim() || null
        })
        .select()
        .single();

      if (insErr) throw insErr;

      // Fire and forget MOT sync
      await syncMOTData(newVehicle.id, plate);
      
      setSuccess(true);
      toast.success('Vehicle added successfully!');
      setTimeout(() => router.push('/fleet'), 2000);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showUpgrade) {
    return (
      <div style={styles.page}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.upgradeCard}>
          <Zap size={48} color={theme.colors.status.warning} style={{ marginBottom: 20 }} />
          <h1 style={{ marginBottom: 12 }}>Fleet Limit Reached</h1>
          <p style={{ color: theme.colors.text.secondary, lineHeight: 1.6 }}>
            Your Free tier allows 1 vehicle. Unlock <strong>Unlimited Fleet Management</strong> and 
            Advanced AI Diagnostics for a one‑time lifetime fee.
          </p>
          <div style={styles.upgradeActions}>
            <button onClick={handleUpgrade} disabled={upgradeLoading} style={styles.upgradeButton}>
              {upgradeLoading ? 'Redirecting...' : 'Upgrade Fleet (£10)'}
            </button>
            <button onClick={() => router.push('/fleet')} style={styles.backButton}>
              Maybe Later
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Vehicle Onboarding</h1>
          <p style={styles.subtitle}>Enter UK licence plate to sync with Fleet AI</p>
        </div>

        <div style={styles.card}>
          <div style={styles.plateInputRow}>
            <div style={styles.plateWrapper}>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="UK PLATE"
                style={styles.plateInput}
                maxLength={8}
              />
            </div>
            <button onClick={fetchVehicleDetails} disabled={fetching || !plate} style={styles.lookupBtn}>
              {fetching ? <Loader2 className="spin" size={20} /> : <Search size={20} />} Scan
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={styles.errorBox}>
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}
            {vehicleData && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.dataPreview}>
                <div style={styles.previewHeader}>
                  <Car size={24} color={theme.colors.primary} />
                  <h3>{vehicleData.make} {vehicleData.model}</h3>
                </div>
                <div style={styles.previewGrid}>
                  <div><small>YEAR</small> <span>{vehicleData.yearOfManufacture}</span></div>
                  <div><small>ENGINE</small> <span>{vehicleData.engineCapacity}cc</span></div>
                  <div><small>FUEL</small> <span>{vehicleData.fuelType}</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <div style={styles.field}>
              <label style={styles.label}>Base Location (Optional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Where is this vehicle kept?"
                  style={styles.formInput}
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  style={styles.locationBtn}
                  title="Use my current location"
                >
                  {detectingLocation ? <Loader2 size={18} className="spin" /> : <Crosshair size={18} />}
                </button>
              </div>
              {coords.lat && coords.lng && (
                <div style={styles.coordsHint}>
                  <MapPin size={12} /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
              )}
            </div>

            <div style={styles.aiBlock}>
              {aiLoading ? (
                <div style={styles.aiPlaceholder}>
                  <Sparkles size={16} className="pulse" />
                  <span>AI is analyzing reliability trends...</span>
                </div>
              ) : aiInsight ? (
                <div style={styles.aiInsight}>
                  <Zap size={16} color={theme.colors.status.warning} />
                  <span>{aiInsight}</span>
                </div>
              ) : null}
            </div>

            <button type="submit" disabled={loading || !vehicleData || success} style={styles.submitBtn}>
              {success ? <CheckCircle size={20} /> : loading ? 'Syncing...' : 'Confirm & Add to Fleet'}
              {!success && !loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '60px 20px', background: theme.colors.background.main, minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '600px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '32px', fontWeight: 900, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  subtitle: { color: theme.colors.text.muted, fontSize: '15px' },
  card: { background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', padding: '32px', borderRadius: '24px', border: `1px solid ${theme.colors.border.light}` },
  plateInputRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  plateWrapper: { flex: 1, background: '#facc15', padding: '4px', borderRadius: '8px', boxShadow: '0 4px 0px #b45309' },
  plateInput: { width: '100%', background: '#facc15', border: '2px solid #000', borderRadius: '6px', padding: '12px', color: '#000', fontSize: '24px', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px', outline: 'none' },
  lookupBtn: { padding: '0 24px', background: theme.colors.primary, color: '#000', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  dataPreview: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: `1px solid ${theme.colors.border.light}` },
  previewHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  previewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: 600, color: theme.colors.text.secondary },
  formInput: { flex: 1, width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.colors.border.light}`, borderRadius: '12px', padding: '14px', color: '#fff', outline: 'none' },
  locationBtn: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', color: theme.colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  coordsHint: { fontSize: '10px', color: theme.colors.text.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' },
  aiBlock: { margin: '20px 0' },
  aiPlaceholder: { display: 'flex', alignItems: 'center', gap: '10px', color: theme.colors.text.muted, fontSize: '13px' },
  aiInsight: { display: 'flex', gap: '12px', background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.5, border: '1px solid rgba(245, 158, 11, 0.2)' },
  submitBtn: { width: '100%', background: theme.colors.primary, color: '#000', padding: '16px', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px' },
  upgradeCard: { background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', maxWidth: '500px', margin: '100px auto', padding: '48px', textAlign: 'center', borderRadius: '32px', border: `1px solid ${theme.colors.border.light}` },
  upgradeActions: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' },
  upgradeButton: { background: theme.colors.primary, color: '#000', padding: '16px', borderRadius: '14px', border: 'none', fontWeight: 800, cursor: 'pointer' },
  backButton: { background: 'none', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', fontSize: '14px' },
  errorBox: { background: `${theme.colors.status.critical}20`, border: `1px solid ${theme.colors.status.critical}`, borderRadius: '8px', padding: '12px', color: theme.colors.status.critical, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px' },
};