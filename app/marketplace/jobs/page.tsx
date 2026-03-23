'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  location?: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current user and check if they're a mechanic
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mechanic) {
        router.push('/marketplace/mechanics/register');
        return;
      }
      setMechanicId(mechanic.id);

      // Fetch open jobs with vehicle details
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          vehicle:vehicles(make, model, license_plate)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (jobId: string) => {
    router.push(`/marketplace/jobs/${jobId}/apply`);
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading jobs...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${theme.colors.border.medium};
            border-top: 3px solid ${theme.colors.primary};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={fetchData} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Available Jobs</h1>
      <p style={styles.subtitle}>Browse repair jobs and submit your application</p>

      {jobs.length === 0 ? (
        <div style={styles.empty}>No open jobs at the moment. Check back later.</div>
      ) : (
        <div style={styles.grid}>
          {jobs.map((job) => (
            <div key={job.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <Briefcase size={20} color={theme.colors.primary} />
                <h2 style={styles.jobTitle}>{job.title}</h2>
              </div>
              <p style={styles.description}>
                {job.description?.slice(0, 120)}
                {job.description && job.description.length > 120 ? '...' : ''}
              </p>
              <div style={styles.details}>
                {job.budget && (
                  <span style={styles.budget}>
                    <DollarSign size={14} />
                    £{job.budget}
                  </span>
                )}
                {job.location && (
                  <span style={styles.location}>
                    <MapPin size={14} />
                    {job.location}
                  </span>
                )}
              </div>
              {job.vehicle && (
                <div style={styles.vehicle}>
                  {job.vehicle.make} {job.vehicle.model} ({job.vehicle.license_plate})
                </div>
              )}
              <div style={styles.date}>
                Posted: {new Date(job.created_at).toLocaleDateString()}
              </div>
              <button onClick={() => handleApply(job.id)} style={styles.applyButton}>
                Apply Now
              </button>
            </div>
          ))}
        </div>
      )}
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
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[8],
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
  retryButton: {
    marginTop: theme.spacing[4],
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: theme.spacing[6],
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  jobTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    margin: 0,
  },
  description: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[4],
    lineHeight: 1.5,
  },
  details: {
    display: 'flex',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  budget: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  location: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  vehicle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[2],
  },
  date: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[4],
  },
  applyButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    marginTop: 'auto',
  },
  empty: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
  },
};