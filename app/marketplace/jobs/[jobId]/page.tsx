'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import PaymentForm from '@/components/PaymentForm';
import ChatWindow from '@/components/ChatWindow';
import theme from '@/app/theme';

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  location?: string;
  user_id: string;
  vehicle_id?: string;
  assigned_mechanic_id?: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

interface Application {
  id: string;
  mechanic_id: string;
  bid_amount: number | null;
  message: string | null;
  status: string;
  created_at: string;
  mechanic?: { business_name: string; id: string };
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMechanic, setIsMechanic] = useState(false);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [jobId]);

  async function fetchData() {
    try {
      setLoading(true);
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

      // Fetch job with vehicle details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          vehicle:vehicles(make, model, license_plate)
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // If owner, fetch applications
      if (user && jobData.user_id === user.id) {
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select(`
            *,
            mechanic:mechanics(business_name, id)
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });

        if (!appsError && appsData) setApplications(appsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (applicationId: string, mechanicId: string) => {
    if (!confirm('Accept this mechanic for the job?')) return;
    setAccepting(true);
    try {
      // Update job to assigned status
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'assigned', assigned_mechanic_id: mechanicId })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // Update application status to accepted
      await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId);

      // Refresh data
      fetchData();
      setSelectedMechanicId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleApply = () => {
    router.push(`/marketplace/jobs/${jobId}/apply`);
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading job details...</p>
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
        <button onClick={() => router.back()} style={styles.backButton}>
          ← Go Back
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={styles.centered}>
        <p>Job not found</p>
        <button onClick={() => router.back()} style={styles.backButton}>
          ← Go Back
        </button>
      </div>
    );
  }

  const isOwner = currentUser && job.user_id === currentUser.id;
  const isAssignedMechanic = mechanicId && job.assigned_mechanic_id === mechanicId;
  const canApply = !isOwner && isMechanic && job.status === 'open';

  // Check if mechanic already applied
  const hasApplied = mechanicId && applications.some(app => app.mechanic_id === mechanicId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back to Jobs
      </button>

      <div style={styles.grid}>
        {/* Job details */}
        <div style={styles.mainCard}>
          <h1 style={styles.title}>{job.title}</h1>
          <div style={styles.meta}>
            <span style={styles.badge}>Status: {job.status}</span>
            <span style={styles.badge}>
              <DollarSign size={14} /> £{job.budget}
            </span>
            {job.location && (
              <span style={styles.badge}>
                <MapPin size={14} /> {job.location}
              </span>
            )}
          </div>
          <p style={styles.description}>{job.description}</p>
          {job.vehicle && (
            <p style={styles.vehicle}>
              Vehicle: {job.vehicle.make} {job.vehicle.model} ({job.vehicle.license_plate})
            </p>
          )}
          <div style={styles.date}>
            <Calendar size={14} style={{ marginRight: '6px' }} />
            Posted: {new Date(job.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Actions panel */}
        <div style={styles.sideCard}>
          {isOwner ? (
            <>
              <h2 style={styles.sectionTitle}>Applications ({applications.length})</h2>
              {applications.length === 0 ? (
                <p style={styles.emptyText}>No applications yet.</p>
              ) : (
                <div style={styles.applicationsList}>
                  {applications.map((app) => (
                    <div key={app.id} style={styles.applicationItem}>
                      <div style={styles.applicationInfo}>
                        <strong>{app.mechanic?.business_name || 'Mechanic'}</strong>
                        {app.bid_amount && (
                          <span style={styles.bidAmount}>£{app.bid_amount}</span>
                        )}
                        {app.message && (
                          <p style={styles.appMessage}>{app.message}</p>
                        )}
                      </div>
                      {job.status === 'open' && (
                        <button
                          onClick={() => handleAccept(app.id, app.mechanic_id)}
                          disabled={accepting}
                          style={styles.acceptButton}
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedMechanicId && job.status === 'open' && (
                <div style={styles.paymentSection}>
                  <h3>Complete Payment</h3>
                  <PaymentForm
                    amount={job.budget * 100}
                    currency="gbp"
                    jobId={job.id}
                    mechanicId={selectedMechanicId}
                    onSuccess={() => fetchData()}
                  />
                </div>
              )}
            </>
          ) : canApply ? (
            <div style={styles.applySection}>
              <h2>Interested in this job?</h2>
              <p>Submit your application to be considered.</p>
              <button onClick={handleApply} style={styles.applyButton}>
                Apply Now
              </button>
            </div>
          ) : isMechanic && hasApplied && job.status === 'open' ? (
            <div style={styles.appliedNotice}>
              <p>✓ You have applied to this job.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chat section */}
      {job.status === 'assigned' && (isOwner || isAssignedMechanic) && currentUser && (
        <div style={styles.chatSection}>
          <h2 style={styles.chatTitle}>
            <MessageSquare size={18} /> Job Chat
          </h2>
          <ChatWindow
            jobId={job.id}
            currentUserId={currentUser.id}
            otherUserId={isOwner ? job.assigned_mechanic_id! : job.user_id}
            otherUserName={isOwner ? 'Mechanic' : 'Job Owner'}
          />
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
  backButton: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    marginBottom: theme.spacing[6],
    transition: 'background 0.2s ease',
  },
  grid: {
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
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[4],
    color: theme.colors.text.primary,
  },
  meta: {
    display: 'flex',
    gap: theme.spacing[3],
    flexWrap: 'wrap',
    marginBottom: theme.spacing[4],
  },
  badge: {
    background: theme.colors.background.elevated,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  description: {
    fontSize: theme.fontSizes.base,
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[4],
  },
  vehicle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[2],
  },
  date: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    display: 'flex',
    alignItems: 'center',
  },
  sideCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[4],
    color: theme.colors.text.primary,
  },
  applicationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[4],
  },
  applicationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing[3],
    background: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
  },
  applicationInfo: {
    flex: 1,
  },
  bidAmount: {
    display: 'inline-block',
    marginLeft: theme.spacing[2],
    padding: `${theme.spacing[0.5]} ${theme.spacing[2]}`,
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
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  paymentSection: {
    marginTop: theme.spacing[6],
    paddingTop: theme.spacing[4],
    borderTop: `1px solid ${theme.colors.border.light}`,
  },
  applySection: {
    textAlign: 'center',
  },
  applyButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    marginTop: theme.spacing[4],
    width: '100%',
    transition: 'background 0.2s ease',
  },
  appliedNotice: {
    textAlign: 'center',
    color: theme.colors.primary,
    padding: theme.spacing[4],
    background: `${theme.colors.primary}20`,
    borderRadius: theme.borderRadius.lg,
  },
  chatSection: {
    marginTop: theme.spacing[8],
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[4],
  },
  chatTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[4],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    color: theme.colors.text.primary,
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
  emptyText: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: theme.spacing[4],
  },
};