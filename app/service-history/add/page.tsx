'use client';

import { useState, useEffect, type CSSProperties, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Wrench,
  MapPin,
  Crosshair,
  Calendar,
  DollarSign,
  Gauge,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

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
] as const;

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
  const [fetchingVehicles, setFetchingVehicles] = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setFetchingVehicles(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, make, model, license_plate')
        .eq('user_id', user.id)
        .order('make', { ascending: true });

      if (vehiclesError) throw vehiclesError;

      setVehicles(data || []);

      if (preselectedVehicleId && data?.some((v) => v.id === preselectedVehicleId)) {
        setSelectedVehicleId(preselectedVehicleId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load vehicles';
      setError(message);
      toast.error(message);
    } finally {
      setFetchingVehicles(false);
    }
  };

  const detectLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
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
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 5000);

          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            }
          );

          window.clearTimeout(timeout);

          const geoData = geoRes.ok ? await geoRes.json() : null;

          if (geoData?.display_name) {
            setLocation(geoData.display_name);
            toast.success('Location detected');
          } else {
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast.error('Coordinates captured, but address could not be resolved');
          }
        } catch {
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.error('Coordinates captured, but address could not be resolved');
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        console.error('Geolocation error:', geoError);
        let errorMsg =
          'Unable to get your location. Please allow location access.';
        if (geoError.code === 1) {
          errorMsg =
            'Location access denied. Please enable it in your browser settings.';
        }
        toast.error(errorMsg);
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getFinalDescription = () => {
    if (descriptionType === 'Custom (write below)') {
      return customDescription.trim();
    }
    return descriptionType.trim();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedMileage = mileage ? Number.parseInt(mileage, 10) : null;
    const parsedCost = cost ? Number.parseFloat(cost) : null;
    const finalDesc = getFinalDescription();
    const trimmedLocation = location.trim();

    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!serviceDate) {
      setError('Service date is required');
      return;
    }
    if (!mileage || Number.isNaN(parsedMileage) || (parsedMileage ?? 0) <= 0) {
      setError('Valid mileage is required');
      return;
    }
    if (cost && (Number.isNaN(parsedCost) || (parsedCost ?? 0) < 0)) {
      setError('Cost must be a valid positive number');
      return;
    }
    if (!descriptionType) {
      setError('Please select a service description');
      return;
    }
    if (!finalDesc) {
      setError('Please enter a custom service description');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase.from('service_history').insert({
        vehicle_id: selectedVehicleId,
        user_id: user.id,
        service_date: serviceDate,
        mileage: parsedMileage,
        description: finalDesc,
        cost: parsedCost,
        location: trimmedLocation || null,
        lat,
        lng,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      toast.success('Service record added!');
      window.setTimeout(() => router.push('/service-history'), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add service record';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <button
        type="button"
        onClick={() => router.back()}
        style={styles.backButton}
      >
        ← Back
      </button>

      <div style={styles.card}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Add Service Record</h1>
            <p style={styles.subtitle}>
              Capture key maintenance details to keep your fleet history complete.
            </p>
          </div>
          {!!vehicles.length && (
            <span style={styles.badge}>
              {vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'} available
            </span>
          )}
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Vehicle */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Vehicle</h2>
            <p style={styles.sectionHint}>
              Choose the vehicle this service belongs to.
            </p>
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
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.license_plate})
                  </option>
                ))}
              </select>
              {fetchingVehicles && (
                <span style={styles.helper}>Loading vehicles...</span>
              )}
            </div>
          </section>

          {/* Core details */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Service details</h2>
            <p style={styles.sectionHint}>
              When was the service done and at what mileage?
            </p>

            <div className="service-row" style={styles.row}>
              <div style={styles.rowCol}>
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

              <div style={styles.rowCol}>
                <label style={styles.label}>Mileage (mi) *</label>
                <div style={styles.inputIconWrapper}>
                  <Gauge size={16} style={styles.inputIcon} />
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
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
          </section>

          {/* Description */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>What work was done?</h2>
            <p style={styles.sectionHint}>
              Select a common service type or add your own description.
            </p>

            <div style={styles.field}>
              <label style={styles.label}>Service Description *</label>
              <select
                value={descriptionType}
                onChange={(e) => setDescriptionType(e.target.value)}
                style={styles.select}
                disabled={loading || success}
                required
              >
                <option value="">Select service type</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
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
          </section>

          {/* Cost + Location */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Optional details</h2>
            <p style={styles.sectionHint}>
              Add cost and garage location to make records more useful later.
            </p>

            <div className="service-row" style={styles.row}>
              <div style={styles.rowCol}>
                <label style={styles.label}>Cost (£)</label>
                <div style={styles.inputIconWrapper}>
                  <DollarSign size={16} style={styles.inputIcon} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 150.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={styles.inputWithIcon}
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div style={styles.rowCol}>
                <label style={styles.label}>Garage Location</label>
                <div style={styles.locationRow}>
                  <div style={styles.locationInputWrap}>
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
                    {detectingLocation ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <Crosshair size={18} />
                    )}
                  </button>
                </div>

                {lat !== null && lng !== null && (
                  <div style={styles.coordsHint}>
                    <MapPin size={12} /> Lat: {lat.toFixed(5)}, Lng:{' '}
                    {lng.toFixed(5)}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Global error/success */}
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

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => router.back()}
              style={styles.secondaryBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={styles.submitBtn}
            >
              {loading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <Wrench size={18} />
              )}
              {loading ? 'Saving...' : 'Add Service Record'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (min-width: 720px) {
          .service-row {
            flex-wrap: nowrap;
          }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: '60px 20px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: '#fff',
  },
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
    maxWidth: '780px',
    margin: '0 auto',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
    boxShadow: '0 18px 40px rgba(15,23,42,0.45)',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    maxWidth: '36rem',
  },
  badge: {
    alignSelf: 'flex-start',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.border.medium}`,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    background: theme.colors.background.subtle,
    whiteSpace: 'nowrap',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[6],
  },
  section: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[1],
  },
  sectionHint: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  label: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 600,
    color: theme.colors.text.secondary,
  },
  select: {
    width: '100%',
    background: theme.colors.background.main,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    cursor: 'pointer',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.main,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    resize: 'vertical',
    outline: 'none',
  },
  inputIconWrapper: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.colors.text.muted,
    pointerEvents: 'none',
  },
  inputWithIcon: {
    width: '100%',
    padding: `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[3]} 36px`,
    background: theme.colors.background.main,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
  },
  row: {
    display: 'flex',
    gap: theme.spacing[4],
    flexWrap: 'wrap',
  },
  rowCol: {
    flex: '1 1 240px',
    minWidth: 0,
  },
  locationRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  locationInputWrap: {
    flex: 1,
    position: 'relative',
  },
  locationBtn: {
    background: theme.colors.background.main,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '46px',
    minWidth: '46px',
  },
  coordsHint: {
    fontSize: '10px',
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  helper: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
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
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  secondaryBtn: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.medium,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
};