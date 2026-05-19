'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

type FormState = {
  title: string;
  description: string;
  mileage: string;
  occurred_at: string;
};

export default function EditServiceEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    mileage: '',
    occurred_at: '',
  });

  useEffect(() => {
    if (!id) {
      setError('Invalid event id');
      setLoading(false);
      return;
    }

    void fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('service_events')
        .select('id, title, description, mileage, occurred_at, user_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error('Service event not found');
      }

      setFormData({
        title: data.title || '',
        description: data.description || '',
        mileage: data.mileage != null ? String(data.mileage) : '',
        occurred_at: data.occurred_at
          ? format(new Date(data.occurred_at), 'yyyy-MM-dd')
          : '',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load service event';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const parsedMileage = formData.mileage
      ? Number.parseInt(formData.mileage, 10)
      : null;
    const occurredAt = formData.occurred_at;

    if (!id) {
      setError('Invalid event id');
      setSaving(false);
      return;
    }

    if (!trimmedTitle) {
      setError('Service title is required');
      setSaving(false);
      return;
    }

    if (trimmedTitle.length < 3) {
      setError('Service title must be at least 3 characters');
      setSaving(false);
      return;
    }

    if (formData.mileage && (Number.isNaN(parsedMileage) || (parsedMileage ?? 0) < 0)) {
      setError('Mileage must be a valid positive number');
      setSaving(false);
      return;
    }

    if (!occurredAt) {
      setError('Service date is required');
      setSaving(false);
      return;
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      const updates = {
        title: trimmedTitle,
        description: trimmedDescription || null,
        mileage: parsedMileage,
        occurred_at: occurredAt,
      };

      const { error } = await supabase
        .from('service_events')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      router.push(`/service-history/${id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save service event';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading event...</p>

        <style jsx>{`
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #22c55e;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error && !formData.title && !formData.occurred_at) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={() => router.back()} style={styles.backButton}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton} type="button">
        ← Back
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>Edit Service Event</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="title" style={styles.label}>
              Service Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              style={styles.input}
              maxLength={120}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="mileage" style={styles.label}>
              Mileage (mi)
            </label>
            <input
              id="mileage"
              type="number"
              min="0"
              inputMode="numeric"
              value={formData.mileage}
              onChange={(e) => updateField('mileage', e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="occurred_at" style={styles.label}>
              Service Date *
            </label>
            <input
              id="occurred_at"
              type="date"
              value={formData.occurred_at}
              onChange={(e) => updateField('occurred_at', e.target.value)}
              required
              style={styles.input}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => router.back()}
              style={styles.cancelButton}
              disabled={saving}
            >
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
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, CSSProperties> = {
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
    gap: 12,
  },
};