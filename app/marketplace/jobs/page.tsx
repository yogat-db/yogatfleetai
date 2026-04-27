'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, PoundSterling, Car, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  location?: string;
  user_id: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMechanic, setIsMechanic] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get Session (faster than getUser for simple checks)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Parallel check: Mechanic Status & Jobs
      const [mechResponse, jobsResponse] = await Promise.all([
        supabase.from('mechanics').select('id, verified').eq('user_id', session.user.id).maybeSingle(),
        supabase
          .from('jobs')
          .select(`*, vehicle:vehicles(make, model, license_plate)`)
          .eq('status', 'open')
          .neq('user_id', session.user.id) // Security: Can't apply to own jobs
          .order('created_at', { ascending: false })
      ]);

      if (mechResponse.error) throw mechResponse.error;
      
      if (!mechResponse.data) {
        setIsMechanic(false);
        setLoading(false);
        return;
      }

      setIsMechanic(true);
      if (jobsResponse.error) throw jobsResponse.error;
      setJobs(jobsResponse.data || []);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // UI: Loading State
  if (loading) return <LoadingSkeleton />;

  // UI: Unregistered Mechanic State
  if (isMechanic === false) {
    return (
      <div style={styles.centered}>
        <div style={styles.alertCard}>
          <AlertCircle size={40} color={theme.colors.primary} />
          <h2 style={{ color: '#fff', margin: '16px 0 8px' }}>Mechanic Access Required</h2>
          <p style={{ textAlign: 'center', marginBottom: '24px' }}>
            To view and apply for repair jobs, you must first register your business as a mechanic.
          </p>
          <button 
            onClick={() => router.push('/marketplace/mechanics/register')} 
            style={styles.registerButton}
          >
            Start Mechanic Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Available Jobs</h1>
        <p style={styles.subtitle}>Find repair opportunities in your area and grow your business.</p>
      </header>

      <AnimatePresence mode="wait">
        {jobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.empty}>
            <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>No open jobs found. Check back in a few minutes!</p>
          </motion.div>
        ) : (
          <div style={styles.grid}>
            {jobs.map((job, index) => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={styles.card}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.iconBadge}><Briefcase size={18} /></div>
                  <h2 style={styles.jobTitle}>{job.title}</h2>
                </div>

                <p style={styles.description}>
                  {job.description?.length > 140 
                    ? `${job.description.slice(0, 140)}...` 
                    : job.description}
                </p>

                <div style={styles.meta}>
                  <div style={styles.metaItem}>
                    <PoundSterling size={14} /> 
                    <span>Est. {job.budget ? `£${job.budget}` : 'TBD'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <MapPin size={14} /> 
                    <span>{job.location || 'Remote/TBD'}</span>
                  </div>
                </div>

                {job.vehicle && (
                  <div style={styles.vehicleTag}>
                    <Car size={14} /> {job.vehicle.make} {job.vehicle.model}
                  </div>
                )}

                <div style={styles.footer}>
                  <div style={styles.date}>
                    <Calendar size={12} /> {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  <button onClick={() => router.push(`/marketplace/jobs/${job.id}/apply`)} style={styles.applyButton}>
                    View & Apply
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-component: Skeleton Loader
function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <div style={{ ...styles.title, width: '300px', height: '40px', background: '#1e293b', borderRadius: '8px' }} />
      <div style={styles.grid}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ ...styles.card, height: '280px', opacity: 0.5, background: '#0f172a' }} />
        ))}
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
  },
  header: { marginBottom: '40px' },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
  },
  subtitle: { color: theme.colors.text.secondary, marginTop: '4px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: '20px',
    padding: '24px',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  iconBadge: {
    background: `${theme.colors.primary}15`,
    padding: '8px',
    borderRadius: '10px',
    color: theme.colors.primary,
  },
  jobTitle: { fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 },
  description: { color: theme.colors.text.secondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' },
  meta: { display: 'flex', gap: '16px', marginBottom: '16px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.colors.primary, fontWeight: '600' },
  vehicleTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#1e293b',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '20px',
    width: 'fit-content',
  },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${theme.colors.border.light}` },
  date: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: theme.colors.text.muted },
  applyButton: {
    background: theme.colors.primary,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#020617',
    fontSize: '13px',
  },
  centered: { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  alertCard: {
    maxWidth: '400px',
    background: '#0f172a',
    padding: '40px',
    borderRadius: '24px',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  registerButton: {
    width: '100%',
    padding: '12px',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  empty: { gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: theme.colors.text.muted },
};