// app/marketplace/jobs/[jobId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase/client';
import ChatWindow from '@/components/ChatWindow';
import theme from '@/app/theme';

// Initialize Stripe (client‑side)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ---------- Payment Form (Client Component) ----------
function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      setError(error.message || 'Payment failed');
    } else {
      onSuccess(); // refresh job details after payment
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.paymentForm}>
      <PaymentElement />
      {error && <div style={styles.paymentError}>{error}</div>}
      <button type="submit" disabled={!stripe || loading} style={styles.paymentButton}>
        {loading ? 'Processing...' : 'Pay & Assign'}
      </button>
    </form>
  );
}

// ---------- Main Page ----------
export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMechanic, setIsMechanic] = useState(false);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (mechanic) {
          setIsMechanic(true);
          setMechanicId(mechanic.id);
        }
      }

      const jobRes = await fetch(`/api/marketplace/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error('Failed to load job');
      const jobData = await jobRes.json();
      setJob(jobData);

      if (user && jobData.user_id === user.id) {
        const appsRes = await fetch(`/api/marketplace/jobs/${jobId}/applications`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(appsData);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptApplication = async (application: any) => {
    if (!confirm(`Accept ${application.mechanic?.business_name} for this job?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/select-mechanic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId: application.mechanic_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      setSelectedMechanic(application.mechanic_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    await fetchData(); // refresh job (now assigned)
    setClientSecret(null);
    setSelectedMechanic(null);
  };

  const handleCompleteJob = async () => {
    if (!confirm('Mark this job as complete? The payment will be released to the mechanic.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete job');
      await fetchData(); // refresh job status
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = currentUser && job?.user_id === currentUser.id;
  const isAssignedMechanic = mechanicId && job?.assigned_mechanic_id === mechanicId;
  const canApply = !isOwner && isMechanic && job?.status === 'open';
  const canComplete = isOwner && job?.status === 'assigned' && job?.payment_status === 'pending';

  if (loading) return <div style={styles.centered}>Loading...</div>;
  if (error) return <div style={styles.centered}>Error: {error}</div>;
  if (!job) return <div style={styles.centered}>Job not found</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back to Jobs
      </button>

      <div style={styles.container}>
        <div style={styles.mainCard}>
          <h1 style={styles.title}>{job.title}</h1>
          <div style={styles.meta}>
            <span style={styles.badge}>Status: {job.status}</span>
            {job.budget && <span style={styles.badge}>Budget: £{job.budget}</span>}
            {job.location && <span style={styles.badge}>📍 {job.location}</span>}
          </div>
          <p style={styles.description}>{job.description}</p>
        </div>

        <div style={styles.sidebarCard}>
          {isOwner ? (
            <>
              <h2 style={styles.sectionTitle}>Applications ({applications.length})</h2>
              {applications.length === 0 ? (
                <p style={styles.emptyText}>No applications yet.</p>
              ) : (
                <div style={styles.applicationsList}>
                  {applications.map((app) => (
                    <div key={app.id} style={styles.applicationItem}>
                      <div>
                        <strong>{app.mechanic?.business_name || 'Mechanic'}</strong>
                        {app.bid_amount && <span style={styles.bidAmount}>£{app.bid_amount}</span>}
                        {app.message && <p style={styles.appMessage}>{app.message}</p>}
                      </div>
                      {job.status === 'open' && (
                        <button
                          onClick={() => handleAcceptApplication(app)}
                          disabled={actionLoading}
                          style={styles.acceptButton}
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {clientSecret && (
                <div style={styles.paymentSection}>
                  <h3>Complete Payment</h3>
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                    <PaymentForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              )}
              {canComplete && (
                <button onClick={handleCompleteJob} disabled={actionLoading} style={styles.completeButton}>
                  Mark Job as Complete
                </button>
              )}
            </>
          ) : canApply ? (
            <div style={styles.applySection}>
              <h2 style={styles.sectionTitle}>Interested in this job?</h2>
              <p>Submit your application to be considered.</p>
              <button
                onClick={() => router.push(`/marketplace/jobs/${jobId}/apply`)}
                style={styles.applyButton}
              >
                Apply Now
              </button>
            </div>
          ) : isAssignedMechanic && job.status === 'assigned' ? (
            <div style={styles.assignedSection}>
              <h2 style={styles.sectionTitle}>You are assigned to this job</h2>
              <p>Use the chat below to communicate with the job owner.</p>
            </div>
          ) : (
            <p style={styles.infoText}>
              {job.status === 'assigned'
                ? 'This job has been assigned to a mechanic.'
                : 'Applications are currently closed.'}
            </p>
          )}
        </div>
      </div>

      {job.status === 'assigned' && (
        <div style={styles.chatSection}>
          <ChatWindow
            jobId={job.id}
            currentUserId={currentUser?.id}
            otherUserId={isOwner ? job.assigned_mechanic_id : job.user_id}
            otherUserName={isOwner ? 'Mechanic' : 'Job Owner'}
          />
        </div>
      )}
    </motion.div>
  );
}

// ---------- Styles (using theme with integer spacing keys) ----------
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[8],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
  backButton: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    color: theme.colors.text.primary,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[6],
    cursor: 'pointer',
  },
  container: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: theme.spacing[6],
  },
  mainCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[6],
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[4],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  meta: {
    display: 'flex',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
    flexWrap: 'wrap' as const,
  },
  badge: {
    background: theme.colors.background.elevated,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  description: {
    fontSize: theme.fontSizes.base,
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
  },
  sidebarCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[4],
  },
  applicationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[4],
  },
  applicationItem: {
    padding: theme.spacing[3],
    background: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bidAmount: {
    display: 'inline-block',
    marginLeft: theme.spacing[2],
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`, // fixed: was 0.5
    background: theme.colors.primary,
    color: theme.colors.background.main,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semibold,
  },
  appMessage: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[2],
  },
  acceptButton: {
    background: theme.colors.primary,
    border: 'none',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    cursor: 'pointer',
    fontWeight: theme.fontWeights.medium,
  },
  paymentSection: {
    marginTop: theme.spacing[6],
    paddingTop: theme.spacing[4],
    borderTop: `1px solid ${theme.colors.border.light}`,
  },
  paymentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[4],
  },
  paymentError: {
    background: `rgba(239,68,68,0.1)`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[2],
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  paymentButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[2],
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
  },
  completeButton: {
    width: '100%',
    background: theme.colors.secondary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[2],
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    marginTop: theme.spacing[4],
  },
  applySection: {
    textAlign: 'center' as const,
  },
  applyButton: {
    background: theme.colors.primary,
    border: 'none',
    padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    marginTop: theme.spacing[4],
    width: '100%',
  },
  assignedSection: {
    textAlign: 'center' as const,
  },
  infoText: {
    color: theme.colors.text.muted,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center' as const,
  },
  emptyText: {
    color: theme.colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center' as const,
  },
  chatSection: {
    marginTop: theme.spacing[6],
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[4],
  },
};