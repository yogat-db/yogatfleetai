// app/jobs/post/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, PoundSterling, Car, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    async function loadVehicles() {
      setFetchingVehicles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
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
          <div style={styles.field}>
            <label style={styles.label}>Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Engine won't start, Brake pad replacement"
              style={styles.input}
              required
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
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}><Car size={14} /> Select Vehicle (optional)</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={styles.select}>
              <option value="">-- Choose a vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.license_plate})</option>
              ))}
            </select>
            {fetchingVehicles && <span style={styles.helper}>Loading your vehicles...</span>}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Briefcase size={18} />}
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    background: theme.colors.background.main,
    minHeight: '100vh',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: '32px',
    border: `1px solid ${theme.colors.border.light}`,
    padding: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '8px',
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: '14px',
    color: theme.colors.text.secondary,
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  input: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: theme.colors.text.primary,
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: theme.colors.text.primary,
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
  },
  select: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: theme.colors.text.primary,
    fontSize: '14px',
    outline: 'none',
  },
  helper: {
    fontSize: '11px',
    color: theme.colors.text.muted,
    marginTop: '4px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    color: theme.colors.status.critical,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: '40px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 700,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};