// app/service-history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import { PlusCircle, Wrench, Gauge, MapPin, DollarSign, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ServiceRecord {
  id: number;
  vehicle: {
    make: string;
    model: string;
    license_plate: string;
  };
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
      console.error('Error fetching service history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <Loader2 size={40} className="spin" style={{ color: theme.colors.primary }} />
        <p>Loading service history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.status.critical }}>Error: {error}</p>
        <button onClick={fetchRecords} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Service History</h1>
          <p style={styles.subtitle}>Track all maintenance records for your fleet</p>
        </div>
        <Link href="/service-history/add" style={styles.addButton}>
          <PlusCircle size={18} /> Add Service Record
        </Link>
      </div>

      {records.length === 0 ? (
        <div style={styles.empty}>
          <Wrench size={48} style={{ opacity: 0.3 }} />
          <h2>No service records yet</h2>
          <p>Add your first service record to keep track of maintenance.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {records.map((record) => (
            <div
              key={record.id}
              style={styles.card}
              onClick={() => router.push(`/service-history/${record.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/service-history/${record.id}`)}
            >
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {record.vehicle.make} {record.vehicle.model} ({record.vehicle.license_plate})
                  </h3>
                  <span style={styles.date}>{new Date(record.service_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={styles.detailsGrid}>
                <div><Gauge size={14} /> {record.mileage.toLocaleString()} mi</div>
                <div><Wrench size={14} /> {record.description}</div>
                {record.cost && <div><DollarSign size={14} /> £{record.cost.toFixed(2)}</div>}
                {record.location && <div><MapPin size={14} /> {record.location}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px 20px', background: theme.colors.background.main, minHeight: '100vh', color: '#fff', fontFamily: theme.fontFamilies.sans },
  header: { maxWidth: '1200px', margin: '0 auto 40px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' },
  title: { fontSize: '32px', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' },
  subtitle: { color: theme.colors.text.secondary, fontSize: '14px' },
  addButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme.colors.primary, color: '#000', padding: '10px 20px', borderRadius: '40px', fontWeight: 700, textDecoration: 'none' },
  list: { maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: theme.colors.background.card, borderRadius: '20px', padding: '20px', border: `1px solid ${theme.colors.border.light}`, cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  date: { fontSize: '14px', color: theme.colors.text.muted },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', fontSize: '14px', color: theme.colors.text.secondary },
  empty: { textAlign: 'center', padding: '80px 20px', color: theme.colors.text.muted },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', minHeight: '80vh' },
  retryBtn: { background: theme.colors.primary, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontWeight: 600, cursor: 'pointer' },
};