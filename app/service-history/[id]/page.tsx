'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

type ServiceEvent = {
  id: string;
  vehicle_id: string;
  title: string;
  description: string | null;
  mileage: number | null;
  occurred_at: string;
  created_at: string;
  vehicle?: {
    id: string;
    license_plate: string;
    make: string | null;
    model: string | null;
  };
};

export default function ServiceEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<ServiceEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_events')
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            license_plate,
            make,
            model
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this service event?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('service_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      router.push('/service-history');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
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

  if (error || !event) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error || 'Event not found'}</p>
        <button onClick={() => router.back()} style={styles.backButton}>Go Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>

      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <span style={styles.vehiclePlate}>{event.vehicle?.license_plate}</span>
            <span style={styles.vehicleName}>
              {event.vehicle?.make} {event.vehicle?.model}
            </span>
          </div>
          <span style={styles.date}>{format(new Date(event.occurred_at), 'MMM d, yyyy')}</span>
        </div>

        <h1 style={styles.title}>{event.title}</h1>
        {event.description && <p style={styles.description}>{event.description}</p>}
        {event.mileage && <p style={styles.mileage}>Mileage: {event.mileage.toLocaleString()} mi</p>}
        <p style={styles.recordedAt}>Recorded: {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}</p>

        <div style={styles.actions}>
          <button
            onClick={() => router.push(`/service-history/${event.id}/edit`)}
            style={styles.editButton}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ ...styles.deleteButton, opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
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
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  vehiclePlate: {
    background: '#1e293b',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginRight: 8,
  },
  vehicleName: {
    fontSize: 13,
    color: '#64748b',
  },
  date: {
    fontSize: 13,
    color: '#94a3b8',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  mileage: {
    fontSize: 14,
    color: '#22c55e',
    background: '#1e293b',
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 30,
    marginBottom: 16,
  },
  recordedAt: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 20,
  },
  actions: {
    marginTop: 30,
    display: 'flex',
    gap: 16,
  },
  editButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
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