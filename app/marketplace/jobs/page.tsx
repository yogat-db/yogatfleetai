'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import VehiclePicker from '@/components/VehiclePicker';

const JOB_TITLES = [
  'Oil change',
  'Brake pad replacement',
  'Engine diagnostic',
  'Tire replacement',
  'Battery replacement',
  'AC recharge',
  'Timing belt replacement',
  'Wheel alignment',
  'Transmission repair',
  'Exhaust repair',
  'Clutch replacement',
  'Head gasket repair',
  'Coolant flush',
  'Spark plug replacement',
  'Fuel injector cleaning',
  'Suspension repair',
  'Alternator replacement',
  'Starter motor replacement',
  'Radiator replacement',
  'Catalytic converter replacement',
];

export default function PostJobPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, year')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
      if (data && data.length > 0) setSelectedVehicle(data[0].id);
    } catch (err) {
      console.error('Failed to fetch vehicles');
    }
  }

  // Reverse geocode using Mapbox
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!accessToken) throw new Error('Mapbox token missing');

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&types=address,place,postcode,locality,neighborhood&limit=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    throw new Error('No address found');
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        try {
          const address = await reverseGeocode(latitude, longitude);
          setLocation(address);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setError('Could not get full address – using coordinates.');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setError('Unable to detect location: ' + err.message);
        setDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalTitle = useCustomTitle ? customTitle : jobTitle;
    if (!finalTitle.trim()) {
      setError('Job title is required');
      setLoading(false);
      return;
    }

    try {
      // 1. Get the session and token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to post a job');
      }
      const token = session.access_token;

      // 2. Build payload
      const payload = {
        vehicle_id: selectedVehicle || null,
        title: finalTitle,
        description,
        budget: budget ? parseInt(budget) : null,
        location: location || null,
        lat,
        lng,
      };

      // 3. Send request with Authorization header
      const res = await fetch('/api/marketplace/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post job');

      setSuccess(true);
      setTimeout(() => router.push('/marketplace'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>

      <h1 style={styles.title}>Post a Repair Job</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Vehicle Selection */}
        <div style={styles.field}>
          <label style={styles.label}>Vehicle *</label>
          <VehiclePicker vehicles={vehicles} activeId={selectedVehicle} onChange={setSelectedVehicle} />
        </div>

        {/* Job Title */}
        <div style={styles.field}>
          <label style={styles.label}>Job Title *</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input type="radio" checked={!useCustomTitle} onChange={() => setUseCustomTitle(false)} /> Select from list
            </label>
            <label style={styles.radioLabel}>
              <input type="radio" checked={useCustomTitle} onChange={() => setUseCustomTitle(true)} /> Enter custom title
            </label>
          </div>

          {!useCustomTitle ? (
            <select value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={styles.select} required>
              <option value="" disabled>Choose a job type</option>
              {JOB_TITLES.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g., Gearbox overhaul"
              style={styles.input}
              required
            />
          )}
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* Budget */}
        <div style={styles.field}>
          <label style={styles.label}>Budget (£) – optional</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g., 200"
            style={styles.input}
          />
        </div>

        {/* Location */}
        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <div style={styles.locationRow}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your location or detect automatically"
              style={{ ...styles.input, flex: 1 }}
            />
            <button type="button" onClick={detectLocation} disabled={detectingLocation} style={styles.detectButton}>
              {detectingLocation ? 'Detecting...' : '📍 Detect'}
            </button>
          </div>
          {lat && lng && (
            <p style={styles.coords}>📍 Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}</p>
          )}
        </div>

        {/* Error / Success */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && (
          <div style={styles.successBox}>
            ✓ Job posted successfully! Redirecting...
          </div>
        )}

        <button type="submit" disabled={loading || success} style={styles.submitButton}>
          {loading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  backButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    cursor: 'pointer',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '32px',
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: { maxWidth: '600px' },
  field: { marginBottom: '24px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' },
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
    color: '#f1f5f9',
    fontSize: '16px',
    outline: 'none',
  },
  select: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
    color: '#f1f5f9',
    fontSize: '16px',
  },
  radioGroup: { display: 'flex', gap: '20px', marginBottom: '12px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#94a3b8' },
  locationRow: { display: 'flex', gap: '8px' },
  detectButton: {
    background: '#334155',
    border: 'none',
    borderRadius: '8px',
    padding: '0 20px',
    color: '#f1f5f9',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  coords: { fontSize: '12px', color: '#22c55e', marginTop: '4px' },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  successBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    color: '#22c55e',
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    color: '#020617',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
};
