'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

export default function EditServiceEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mileage: '',
    occurred_at: '',
  });

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_events')
        .select('title, description, mileage, occurred_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFormData({
        title: data.title || '',
        description: data.description || '',
        mileage: data.mileage ? String(data.mileage) : '',
        occurred_at: data.occurred_at ? format(new Date(data.occurred_at), 'yyyy-MM-dd') : '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: any = {
        title: formData.title,
        description: formData.description || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        occurred_at: formData.occurred_at,
      };

      const { error } = await supabase
        .from('service_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      router.push(`/service-history/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading event...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={() => router.back()} style={styles.backButton}>Go Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>

      <div style={styles.card}>
        <h1 style={styles.title}>Edit Service Event</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="title" style={styles.label}>Service Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="description" style={styles.label}>Description</label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="mileage" style={styles.label}>Mileage (mi)</label>
            <input
              id="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="occurred_at" style={styles.label}>Service Date *</label>
            <input
              id="occurred_at"
              type="date"
              value={formData.occurred_at}
              onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <div style={styles.actions}>
            <button type="button" onClick={() => router.back()} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.saveButton}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
    border: '1px solid #1e293b',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: 30,
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 20,
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 20,
    padding: 30,
    maxWidth: 600,
    margin: '0 auto',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 30,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
  },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    background: '#1e293b',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveButton: {
    background: '#22c55e',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    color: '#020617',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
};