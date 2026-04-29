// app/service-history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import { PlusCircle, Wrench, Gauge, MapPin, DollarSign, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ServiceRecord {
  id: number;
  vehicle: { make: string; model: string; license_plate: string };
  service_date: string;
  mileage: number;
  description: string;
  cost: number | null;
  location: string | null;
}

export default function ServiceHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('service_history')
        .select(`
          id,
          service_date,
          mileage,
          description,
          cost,
          location,
          vehicles!inner (make, model, license_plate)
        `)
        .eq('user_id', user.id)
        .order('service_date', { ascending: false });

      if (error) throw error;
      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        service_date: item.service_date,
        mileage: item.mileage,
        description: item.description,
        cost: item.cost,
        location: item.location,
        vehicle: item.vehicles,
      }));
      setRecords(formatted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this service record permanently?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('service_history').delete().eq('id', id);
      if (error) throw error;
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Deleted successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div style={styles.centered}><Loader2 size={40} className="spin" /><p>Loading...</p></div>;
  }
  if (error) {
    return <div style={styles.centered}>Error: {error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Service History</h1>
        <Link href="/service-history/add" style={styles.addButton}>
          <PlusCircle size={18} /> Add Record
        </Link>
      </div>
      {records.length === 0 ? (
        <div style={styles.empty}>No service records yet.</div>
      ) : (
        <div style={styles.list}>
          {records.map(record => (
            <div key={record.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3>{record.vehicle.make} {record.vehicle.model} ({record.vehicle.license_plate})</h3>
                  <span>{new Date(record.service_date).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleDelete(record.id)} disabled={deletingId === record.id} style={styles.deleteBtn}>
                  {deletingId === record.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                </button>
              </div>
              <div style={styles.details}>
                <div><Gauge size={14} /> {record.mileage.toLocaleString()} mi</div>
                <div><Wrench size={14} /> {record.description}</div>
                {record.cost && <div><DollarSign size={14} /> £{record.cost}</div>}
                {record.location && <div><MapPin size={14} /> {record.location}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 'clamp(16px, 4vw, 32px)', background: theme.colors.background.main, minHeight: '100vh', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' },
  title: { fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  addButton: { background: theme.colors.primary, color: '#000', padding: '8px 16px', borderRadius: '40px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: theme.colors.background.card, borderRadius: '16px', padding: '16px', border: `1px solid ${theme.colors.border.light}` },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  deleteBtn: { background: 'transparent', border: `1px solid ${theme.colors.status.critical}40`, borderRadius: '8px', padding: '6px', cursor: 'pointer', color: theme.colors.status.critical },
  details: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '12px', fontSize: '13px', color: theme.colors.text.secondary },
  empty: { textAlign: 'center', padding: '60px', color: theme.colors.text.muted },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
};