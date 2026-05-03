// app/jobs/post/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, PoundSterling, Car, AlertCircle, Loader2, Crosshair, Tag, Clock, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

// Static Data
const JOB_CATEGORIES = [
  'Engine & Mechanical',
  'Brakes & Suspension',
  'Electrical & Electronics',
  'Transmission & Drivetrain',
  'Exhaust & Emissions',
  'Heating & Cooling',
  'Bodywork & Paint',
  'Tyres & Wheels',
  'Diagnostic only',
  'Other',
];

const URGENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate (today/tomorrow)', days: 1 },
  { value: 'week', label: 'Within a week', days: 7 },
  { value: 'month', label: 'Within a month', days: 30 },
  { value: 'flexible', label: 'Flexible', days: null },
];

const SERVICE_TYPES = [
  { value: 'repair', label: 'Repair', icon: '🔧' },
  { value: 'maintenance', label: 'Maintenance / Service', icon: '🛠️' },
  { value: 'diagnostic', label: 'Diagnostic only', icon: '🩺' },
];

export default function PostJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Array<{ id: string; make: string; model: string; license_plate: string }>>([]);
  const [fetchingVehicles, setFetchingVehicles] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [savedLocations, setSavedLocations] = useState<string[]>([]);

  useEffect(() => {
    async function loadUserData() {
      setFetchingVehicles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .eq('user_id', user.id);
        if (data) setVehicles(data);

        const stored = localStorage.getItem('job_locations');
        if (stored) {
          try { setSavedLocations(JSON.parse(stored)); } catch {}
        }
      }
      setFetchingVehicles(false);
    }
    loadUserData();
  }, []);

  const saveLocation = (loc: string) => {
    if (!loc.trim()) return;
    const updated = [loc, ...savedLocations.filter(l => l !== loc)].slice(0, 5);
    setSavedLocations(updated);
    localStorage.setItem('job_locations', JSON.stringify(updated));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        let address = coordsString;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.display_name) address = geoData.display_name;
          }
        } catch (err) {
          console.warn('Reverse geocoding failed', err);
        }
        setLocation(address);
        saveLocation(address);
        toast.success('Location detected');
        setDetectingLocation(false);
      },
      (err) => {
        console.error(err);
        toast.error(err.code === 1 ? 'Location permission denied' : 'Unable to get location');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!title.trim()) {
    setError('Title is required');
    return;
  }
  setLoading(true);
  setError(null);
  try {
    // ✅ Get the current session and access token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('You are not logged in. Please log in again.');
    }
    const token = session.access_token;
    if (!token) throw new Error('No access token available');

    const enhancedTitle = category ? `[${category}] ${title}` : title;
    const enhancedDesc = [
      description,
      category && `Category: ${category}`,
      urgency && `Urgency: ${URGENCY_OPTIONS.find(u => u.value === urgency)?.label}`,
      serviceType && `Service type: ${serviceType}`,
    ].filter(Boolean).join('\n');

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,   // ✅ Send token here
      },
      body: JSON.stringify({
        title: enhancedTitle,
        description: enhancedDesc || null,
        budget: budget ? parseFloat(budget) : null,
        location: location.trim() || null,
        vehicle_id: vehicleId || null,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to post job');
    toast.success('Job posted successfully!');
    router.push('/marketplace/jobs');
  } catch (err: any) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Post a Repair Job</h1>
        <p style={styles.subtitle}>Describe the issue and get quotes from trusted mechanics</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}><Tag size={14} /> Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
                <option value="">-- Select category --</option>
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}><Wrench size={14} /> Service Type</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} style={styles.input}>
                <option value="">-- Select type --</option>
                {SERVICE_TYPES.map(t => <option key={t.value} value={t.label}>{t.icon} {t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Job Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Engine won't start, Brake pad replacement" style={styles.input} required />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Provide details about the issue, your car, etc." style={styles.textarea} />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}><PoundSterling size={14} /> Budget (£)</label>
              <input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g., 150" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}><Clock size={14} /> Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={styles.input}>
                <option value="">-- When do you need it? --</option>
                {URGENCY_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}><MapPin size={14} /> Location</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} onBlur={() => location.trim() && saveLocation(location)} placeholder="e.g., London, SW1A 1AA or use crosshair" style={{ ...styles.input, flex: 1 }} list="saved-locations" />
              <datalist id="saved-locations">{savedLocations.map(loc => <option key={loc} value={loc} />)}</datalist>
              <button type="button" onClick={detectLocation} disabled={detectingLocation} style={styles.locationBtn} title="Use my current location">
                {detectingLocation ? <Loader2 size={18} className="spin" /> : <Crosshair size={18} />}
              </button>
            </div>
            {savedLocations.length > 0 && <span style={styles.helper}>Recently used: {savedLocations.slice(0, 2).join(', ')}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}><Car size={14} /> Select Vehicle (optional)</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={styles.input}>
              <option value="">-- Choose a vehicle --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.license_plate})</option>)}
            </select>
            {fetchingVehicles && <span style={styles.helper}>Loading your vehicles...</span>}
          </div>

          {error && <div style={styles.errorBox}><AlertCircle size={16} /> <span>{error}</span></div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? <Loader2 size={18} className="spin" /> : <Briefcase size={18} />}
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px', background: theme.colors.background.main, minHeight: '100vh' },
  card: { background: theme.colors.background.card, borderRadius: '32px', border: `1px solid ${theme.colors.border.light}`, padding: '40px' },
  title: { fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: theme.colors.text.primary },
  subtitle: { fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  label: { fontSize: '13px', fontWeight: 600, color: theme.colors.text.secondary, display: 'flex', alignItems: 'center', gap: '6px' },
  input: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '12px', padding: '12px 16px', color: theme.colors.text.primary, fontSize: '14px', outline: 'none' },
  textarea: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '12px', padding: '12px 16px', color: theme.colors.text.primary, fontSize: '14px', resize: 'vertical', outline: 'none' },
  helper: { fontSize: '11px', color: theme.colors.text.muted, marginTop: '4px' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '10px', background: `${theme.colors.status.critical}15`, border: `1px solid ${theme.colors.status.critical}`, borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: theme.colors.status.critical },
  button: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: theme.colors.primary, border: 'none', borderRadius: '40px', padding: '14px 24px', fontSize: '16px', fontWeight: 700, color: theme.colors.background.main, cursor: 'pointer', transition: 'opacity 0.2s' },
  locationBtn: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.colors.text.secondary },
};