// app/service-history/add/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import { 
  AlertCircle, CheckCircle, Loader2, 
  Wrench, MapPin, Crosshair, Calendar, DollarSign, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

// Predefined service types (you can expand this list)
const SERVICE_TYPES = [
  'Oil Change',
  'Brake Pad Replacement',
  'Tyre Rotation',
  'Engine Tune-up',
  'Battery Replacement',
  'Air Filter Change',
  'Coolant Flush',
  'Transmission Service',
  'Wheel Alignment',
  'General Inspection',
  'Custom (write below)',
];

export default function AddServiceHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [mileage, setMileage] = useState('');
  const [descriptionType, setDescriptionType] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [cost, setCost] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [fetchingVehicles, setFetchingVehicles] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setFetchingVehicles(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id);
    setVehicles(data || []);
    if (preselectedVehicleId && data?.some(v => v.id === preselectedVehicleId)) {
      setSelectedVehicleId(preselectedVehicleId);
    }
    setFetchingVehicles(false);
  };

  // Auto-detect location using browser geolocation + reverse geocoding
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          // Use OpenStreetMap Nominatim (free, no API key)
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const geoData = await geoRes.json();
          if (geoData.display_name) {
            setLocation(geoData.display_name);
            toast.success('Location detected');
          } else {
            setLocation(`${latitude}, ${longitude}`);
            toast.error('Coordinates captured, but address could not be resolved');
          }
        } catch {
          setLocation(`${latitude}, ${longitude}`);
          toast.error('Coordinates captured, but address could not be resolved');
        }
        setDetectingLocation(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMsg = 'Unable to get your location. Please allow location access.';
        if (err.code === 1) errorMsg = 'Location access denied. Please enable it in your browser settings.';
        toast.error(errorMsg);
        setDetectingLocation(false);
      }
    );
  };

  const getFinalDescription = () => {
    if (descriptionType === 'Custom (write below)') return customDescription.trim();
    return descriptionType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!serviceDate) {
      setError('Service date is required');
      return;
    }
    if (!mileage || parseInt(mileage) <= 0) {
      setError('Valid mileage is required');
      return;
    }
    const finalDesc = getFinalDescription();
    if (!finalDesc) {
      setError('Please select or enter a service description');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('service_history').insert({
        vehicle_id: selectedVehicleId,
        user_id: user.id,
        service_date: serviceDate,
        mileage: parseInt(mileage),
        description: finalDesc,
        cost: cost ? parseFloat(cost) : null,
        location: location.trim() || null,
        lat: lat,
        lng: lng,
      });
      if (error) throw error;
      setSuccess(true);
      toast.success('Service record added!');
      setTimeout(() => router.push('/service-history'), 2000);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>
      <div style={styles.card}>
        <h1 style={styles.title}>Add Service Record</h1>
        <p style={styles.subtitle}>Log maintenance for your vehicle</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Vehicle *</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              style={styles.select}
              required
              disabled={loading || success}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.license_plate})
                </option>
              ))}
            </select>
            {fetchingVehicles && <span style={styles.helper}>Loading vehicles...</span>}
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Service Date *</label>
              <div style={styles.inputIconWrapper}>
                <Calendar size={16} style={styles.inputIcon} />
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  style={styles.inputWithIcon}
                  required
                  disabled={loading || success}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Mileage (mi) *</label>
              <div style={styles.inputIconWrapper}>
                <Gauge size={16} style={styles.inputIcon} />
                <input
                  type="number"
                  placeholder="e.g., 45000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  style={styles.inputWithIcon}
                  required
                  disabled={loading || success}
                />
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Service Description *</label>
            <select
              value={descriptionType}
              onChange={(e) => setDescriptionType(e.target.value)}
              style={styles.select}
              required={descriptionType !== 'Custom (write below)'}
              disabled={loading || success}
            >
              <option value="">Select service type</option>
              {SERVICE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {descriptionType === 'Custom (write below)' && (
              <textarea
                rows={2}
                placeholder="Describe the service performed..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                style={styles.textarea}
                required
                disabled={loading || success}
              />
            )}
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Cost (£) (optional)</label>
              <div style={styles.inputIconWrapper}>
                <DollarSign size={16} style={styles.inputIcon} />
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 150.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  style={styles.inputWithIcon}
                  disabled={loading || success}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Garage Location</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <MapPin size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="e.g., Kwik Fit, Manchester"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={styles.inputWithIcon}
                    disabled={loading || success}
                  />
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingLocation || loading || success}
                  style={styles.locationBtn}
                  title="Use my current location"
                >
                  {detectingLocation ? <Loader2 size={18} className="spin" /> : <Crosshair size={18} />}
                </button>
              </div>
              {lat && lng && (
                <div style={styles.coordsHint}>
                  <MapPin size={12} /> Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={styles.successBox}>
              <CheckCircle size={16} /> Service record added! Redirecting...
            </div>
          )}

          <button type="submit" disabled={loading || success} style={styles.submitBtn}>
            {loading ? <Loader2 className="spin" size={18} /> : <Wrench size={18} />}
            {loading ? 'Saving...' : 'Add Service Record'}
          </button>
        </form>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '60px 20px', background: theme.colors.background.main, minHeight: '100vh', color: '#fff' },
  backButton: {
    position: 'fixed',
    top: theme.spacing[5],
    left: theme.spacing[5],
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10,
  },
  card: {
    maxWidth: '700px',
    margin: '0 auto',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
  },
  title: { fontSize: theme.fontSizes['3xl'], fontWeight: theme.fontWeights.bold, marginBottom: theme.spacing[2] },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing[6] },
  form: { display: 'flex', flexDirection: 'column', gap: theme.spacing[5] },
  field: { display: 'flex', flexDirection: 'column', gap: theme.spacing[2] },
  label: { fontSize: theme.fontSizes.sm, fontWeight: 600, color: theme.colors.text.secondary },
  select: {
    width: '100%',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    resize: 'vertical',
  },
  inputIconWrapper: { position: 'relative', width: '100%' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.muted },
  inputWithIcon: {
    width: '100%',
    padding: `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[3]} 36px`,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
  },
  locationBtn: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '46px',
  },
  coordsHint: { fontSize: '10px', color: theme.colors.text.muted, marginTop: theme.spacing[1], display: 'flex', alignItems: 'center', gap: '4px' },
  row: { display: 'flex', gap: theme.spacing[4], flexWrap: 'wrap' },
  helper: { fontSize: theme.fontSizes.xs, color: theme.colors.text.muted, marginTop: theme.spacing[1] },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.status.critical}20`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.status.critical,
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
  },
  submitBtn: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
};