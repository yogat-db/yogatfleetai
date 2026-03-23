'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, AlertCircle, CheckCircle, Loader2, Crosshair } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

export default function PostJobPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id);
    if (!error && data) setVehicles(data);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode using Mapbox (if you have token)
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${position.coords.longitude},${position.coords.latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=address&limit=1`
          );
          const data = await res.json();
          if (data.features && data.features.length) {
            setLocation(data.features[0].place_name);
          } else {
            setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
          }
        } catch (err) {
          console.error('Reverse geocoding failed', err);
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setError('Unable to detect location: ' + err.message);
        setDetecting(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedVehicle) throw new Error('Please select a vehicle');
      if (!title.trim()) throw new Error('Job title is required');
      if (!description.trim()) throw new Error('Job description is required');
      const budgetNum = parseFloat(budget);
      if (isNaN(budgetNum) || budgetNum <= 0) throw new Error('Budget must be a positive number');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      const { error: insertError } = await supabase.from('jobs').insert({
        title: title.trim(),
        description: description.trim(),
        budget: budgetNum,
        status: 'open',
        user_id: user.id,
        vehicle_id: selectedVehicle,
        location: location.trim() || null,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push('/marketplace/jobs'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (vehicles.length === 0 && !loading) {
    return (
      <div style={styles.centered}>
        <p>You don't have any vehicles yet.</p>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addVehicleButton}>
          Add a Vehicle
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>
      <div style={styles.card}>
        <h1 style={styles.title}>Post a Repair Job</h1>
        <p style={styles.subtitle}>
          Describe the issue and attract local mechanics
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Vehicle *</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={styles.select}
              required
              disabled={loading}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.license_plate})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Engine diagnostic"
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the issue in detail..."
              style={styles.textarea}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Budget (£) *</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., 200"
              style={styles.input}
              required
              disabled={loading}
              step="1"
              min="1"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              <MapPin size={16} style={{ marginRight: '4px' }} />
              Location (optional)
            </label>
            <div style={styles.locationRow}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 123 High Street, Leicester"
                style={styles.locationInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                style={styles.detectButton}
              >
                {detecting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Crosshair size={16} />}
                Auto‑detect
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <CheckCircle size={16} />
              Job posted successfully! Redirecting...
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            style={styles.submitButton}
          >
            {loading ? 'Posting...' : 'Post Job'}
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
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    display: 'flex',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing[5],
    left: theme.spacing[5],
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[8],
    marginTop: theme.spacing[10],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[6],
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[5],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  label: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  input: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border 0.2s ease',
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    cursor: 'pointer',
  },
  locationRow: {
    display: 'flex',
    gap: theme.spacing[3],
  },
  locationInput: {
    flex: 1,
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
  },
  detectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `0 ${theme.spacing[3]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.error,
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
  submitButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    marginTop: theme.spacing[2],
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
    gap: theme.spacing[4],
  },
  addVehicleButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
};