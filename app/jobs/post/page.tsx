// app/jobs/post/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, PoundSterling, Car, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  year: number | null;
}

export default function PostJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fetchingVehicles, setFetchingVehicles] = useState(true);

  useEffect(() => {
    async function loadVehicles() {
      setFetchingVehicles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate, year')
          .eq('user_id', user.id);
        if (data) setVehicles(data);
      }
      setFetchingVehicles(false);
    }
    loadVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          budget: budget ? parseFloat(budget) : null,
          location: location.trim() || null,
          vehicle_id: vehicleId,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      <div style={styles.card}>
        <h1 style={styles.title}>Post a Repair Job</h1>
        <p style={styles.subtitle}>Describe the issue and get quotes from trusted mechanics</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Engine won't start, Brake pad replacement"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide details about the issue, your car, etc."
              style={styles.textarea}
              disabled={loading}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}><PoundSterling size={14} /> Budget (£)</label>
              <input
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., 150"
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}><MapPin size={14} /> Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., London, SW1A 1AA"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}><Car size={14} /> Select Vehicle *</label>
            {fetchingVehicles ? (
              <div style={styles.helper}>Loading your vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div style={styles.warningBox}>
                <AlertCircle size={16} />
                <span>No vehicles found. Please <button type="button" onClick={() => router.push('/vehicles/add')} style={styles.linkButton}>add a vehicle</button> first.</span>
              </div>
            ) : (
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                style={styles.select}
                disabled={loading}
              >
                <option value="">-- Choose a vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.license_plate}) {v.year ? `- ${v.year}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || fetchingVehicles || vehicles.length === 0}
            style={{
              ...styles.button,
              opacity: (loading || fetchingVehicles || vehicles.length === 0) ? 0.6 : 1,
              cursor: (loading || fetchingVehicles || vehicles.length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Briefcase size={18} />}
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'clamp(16px, 4vw, 40px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 'clamp(20px, 5vw, 40px)',
  },
  title: {
    fontSize: 'clamp(24px, 6vw, 32px)',
    fontWeight: 800,
    marginBottom: theme.spacing[2],
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 'clamp(12px, 4vw, 14px)',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing[4],
  },
  label: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 600,
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  input: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    resize: 'vertical',
    outline: 'none',
  },
  select: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    cursor: 'pointer',
  },
  helper: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    padding: theme.spacing[2],
  },
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.status.warning}15`,
    border: `1px solid ${theme.colors.status.warning}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.status.warning,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.primary,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.status.critical,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing[4],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    transition: 'opacity 0.2s',
    marginTop: theme.spacing[2],
  },
};