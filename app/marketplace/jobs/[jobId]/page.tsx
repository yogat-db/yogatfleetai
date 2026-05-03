// app/marketplace/jobs/[jobId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, MapPin, PoundSterling, Car, Calendar, AlertCircle,
  Clock, User, MessageSquare, DollarSign, CheckCircle, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

// ==================== TYPES ====================
interface Job {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  user_id: string;
  assigned_mechanic_id?: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

interface Application {
  id: string;
  mechanic_id: string;
  bid_amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  mechanic?: { business_name: string; id: string; rating?: number };
}

// ==================== MAIN COMPONENT ====================
export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [user, setUser] = useState<any>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Mechanic check
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setMechanicId(mechanic?.id || null);

      // Job details
      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select(`*, vehicle:vehicles(make, model, license_plate)`)
        .eq('id', jobId)
        .single();
      if (jobErr) throw new Error(jobErr.message);
      if (!jobData) throw new Error('Job not found');
      setJob(jobData);

      // Applications (only if owner)
      if (jobData.user_id === user.id) {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select(`*, mechanic:mechanics(business_name, id, rating)`)
          .eq('job_id', jobId)
          .order('bid_amount', { ascending: true });
        if (!appsErr) setApplications(apps || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    if (jobId) fetchData();
  }, [jobId, fetchData]);

  const handleSelectMechanic = (app: Application) => {
    setSelectedApp(app);
    setShowPayment(true);
    // scroll to payment section
    setTimeout(() => {
      document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedApp || !job) return;
    // Update job: assign mechanic, change status
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'assigned',
        assigned_mechanic_id: selectedApp.mechanic_id,
      })
      .eq('id', job.id);
    if (error) {
      toast.error('Failed to update job. Please contact support.');
      return;
    }
    // Mark application as accepted
    await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', selectedApp.id);
    toast.success('Mechanic selected and payment confirmed!');
    setShowPayment(false);
    fetchData(); // refresh
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!job) return <div>Job not found</div>;

  const isOwner = user?.id === job.user_id;
  const hasApplied = applications.some(a => a.mechanic_id === mechanicId);

  return (
    <div style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back to Jobs</button>

      <div style={styles.grid}>
        {/* LEFT COLUMN: Job Details */}
        <div style={styles.mainCard}>
          <div style={styles.statusRow}>
            <h1 style={styles.title}>{job.title}</h1>
            <span style={{ ...styles.badge, backgroundColor: job.status === 'open' ? '#22c55e' : '#3b82f6' }}>
              {job.status.toUpperCase()}
            </span>
          </div>
          <div style={styles.metaRow}>
            <div style={styles.metaItem}><PoundSterling size={16} /> £{job.budget ?? 'TBD'}</div>
            <div style={styles.metaItem}><MapPin size={16} /> {job.location || 'Remote'}</div>
            <div style={styles.metaItem}><Calendar size={16} /> {new Date(job.created_at).toLocaleDateString()}</div>
          </div>
          <div style={styles.divider} />
          <p style={styles.description}>{job.description}</p>
          {job.vehicle && (
            <div style={styles.vehicleBox}>
              <h4 style={{ margin: '0 0 8px 0' }}>Vehicle</h4>
              <p>{job.vehicle.make} {job.vehicle.model} – {job.vehicle.license_plate}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Applications / Actions */}
        <div style={styles.sideCard}>
          {isOwner ? (
            <div>
              <h3 style={styles.sectionTitle}>Bids ({applications.length})</h3>
              {applications.length === 0 ? (
                <div style={styles.emptyState}>No bids yet. Share the job with mechanics.</div>
              ) : (
                <div style={styles.appList}>
                  {applications.map(app => (
                    <div key={app.id} style={styles.appCard}>
                      <div style={styles.appHeader}>
                        <strong>{app.mechanic?.business_name || 'Mechanic'}</strong>
                        <span style={styles.bidAmount}>£{app.bid_amount}</span>
                      </div>
                      <p style={styles.appMessage}>{app.message}</p>
                      {app.mechanic?.rating && (
                        <div style={styles.rating}><Star size={14} fill="#fbbf24" color="#fbbf24" /> {app.mechanic.rating}</div>
                      )}
                      {job.status === 'open' && (
                        <button onClick={() => handleSelectMechanic(app)} style={styles.selectBtn}>Select & Escrow</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {job.status === 'open' && mechanicId && !hasApplied && (
                <button onClick={() => router.push(`/marketplace/jobs/${jobId}/apply`)} style={styles.primaryBtn}>Submit Quote</button>
              )}
              {hasApplied && <div style={styles.infoBanner}>Application submitted – Awaiting owner review</div>}
              {job.status !== 'open' && <div style={styles.infoBanner}>This job is no longer accepting applications.</div>}
              {!mechanicId && <div style={styles.infoBanner}>Register as a mechanic to bid on jobs.</div>}
            </div>
          )}
        </div>
      </div>

      {/* Payment & Escrow (owner only) */}
      {isOwner && showPayment && selectedApp && (
        <div id="payment-section" style={styles.paymentContainer}>
          <h3>Secure Escrow Payment</h3>
          <p>You are authorising £{selectedApp.bid_amount}. Funds are held securely and only released upon completion.</p>
          {/* Payment form will be integrated here – for now a placeholder */}
          <button onClick={handlePaymentSuccess} style={styles.paymentBtn}>Confirm Payment (Integration Ready)</button>
          <button onClick={() => setShowPayment(false)} style={styles.cancelBtn}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ==================== SUB‑COMPONENTS ====================
function LoadingSkeleton() {
  return <div style={styles.centered}><div className="spinner" /><p>Loading job details...</p></div>;
}
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={styles.centered}>
      <p style={{ color: theme.colors.status.critical }}>Error: {error}</p>
      <button onClick={onRetry} style={styles.retryButton}>Try Again</button>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: { padding: 'clamp(20px, 5vw, 40px)', background: theme.colors.background.main, minHeight: '100vh', color: '#fff' },
  backButton: { background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: '40px', padding: '8px 20px', color: theme.colors.text.secondary, cursor: 'pointer', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' },
  mainCard: { background: theme.colors.background.card, borderRadius: '24px', padding: 'clamp(20px, 5vw, 32px)', border: `1px solid ${theme.colors.border.light}` },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
  title: { fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, margin: 0 },
  badge: { padding: '4px 12px', borderRadius: '40px', fontSize: '12px', fontWeight: 700, color: '#fff' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px', color: theme.colors.text.secondary },
  metaItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' },
  divider: { margin: '24px 0', border: 0, borderTop: `1px solid ${theme.colors.border.light}` },
  description: { fontSize: '16px', lineHeight: 1.6, color: theme.colors.text.secondary, whiteSpace: 'pre-wrap' },
  vehicleBox: { marginTop: '24px', padding: '16px', background: theme.colors.background.subtle, borderRadius: '16px' },
  sideCard: { background: theme.colors.background.card, borderRadius: '24px', padding: 'clamp(20px, 5vw, 24px)', border: `1px solid ${theme.colors.border.light}`, height: 'fit-content' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '16px' },
  appList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  appCard: { padding: '16px', background: theme.colors.background.subtle, borderRadius: '16px' },
  appHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  bidAmount: { fontWeight: 800, fontSize: '18px', color: theme.colors.primary },
  appMessage: { fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '12px' },
  rating: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#fbbf24' },
  selectBtn: { width: '100%', background: theme.colors.primary, border: 'none', borderRadius: '12px', padding: '10px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' },
  primaryBtn: { width: '100%', background: theme.colors.primary, border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, cursor: 'pointer' },
  infoBanner: { background: theme.colors.background.subtle, padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', color: theme.colors.text.muted },
  paymentContainer: { marginTop: '40px', padding: '24px', background: theme.colors.background.card, borderRadius: '24px', border: `2px solid ${theme.colors.primary}`, textAlign: 'center' },
  paymentBtn: { background: theme.colors.primary, border: 'none', borderRadius: '40px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer', margin: '16px 8px 0 0' },
  cancelBtn: { background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: '40px', padding: '12px 24px', cursor: 'pointer', marginTop: '16px' },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' },
  retryButton: { background: theme.colors.primary, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '32px', color: theme.colors.text.muted },
};

// Add global spinner animation (already in globals.css, but add if missing)