'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Gavel,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | null;

type MechanicVerificationState =
  | 'checking'
  | 'verified'
  | 'missing_profile'
  | 'unverified'
  | 'failed';

type JobPreview = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: JobStatus;
  location: string | null;
  assigned_mechanic_id: string | null;
};

type EligibilityState =
  | 'checking'
  | 'ready'
  | 'job_not_found'
  | 'job_closed'
  | 'job_assigned'
  | 'missing_profile'
  | 'unverified'
  | 'already_applied'
  | 'failed';

const isUuid = (value: string) =>
  /^[a-f\d]{8}-([a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value);

function deriveQuoteHints(text: string) {
  const normalized = text.toLowerCase();

  const urgency =
    normalized.includes('urgent') ||
    normalized.includes('asap') ||
    normalized.includes('breakdown') ||
    normalized.includes('stranded')
      ? 'High priority'
      : normalized.includes('week')
      ? 'Within a week'
      : 'Flexible';

  const serviceMode =
    normalized.includes('diagnostic')
      ? 'Diagnostic-focused'
      : normalized.includes('mobile')
      ? 'Likely mobile repair'
      : normalized.includes('breakdown') || normalized.includes('roadside')
      ? 'Roadside support'
      : 'General repair';

  return { urgency, serviceMode };
}

function getEligibilityMessage(state: EligibilityState, jobStatus: JobStatus) {
  switch (state) {
    case 'job_not_found':
      return 'This job could not be found.';
    case 'job_closed':
      return jobStatus
        ? `This job is already ${jobStatus}. New quotes are closed.`
        : 'This job is no longer accepting quotes.';
    case 'job_assigned':
      return 'This job has already been assigned to a mechanic.';
    case 'missing_profile':
      return 'You need to complete mechanic registration before submitting a quote.';
    case 'unverified':
      return 'Your mechanic account is pending verification.';
    case 'already_applied':
      return 'You have already submitted a quote for this job.';
    case 'failed':
      return 'Unable to verify your eligibility to quote right now.';
    default:
      return null;
  }
}

export default function ApplyJobPage() {
  const router = useRouter();

  // IMPORTANT:
  // If your route folder is app/marketplace/jobs/[id]/apply/page.tsx,
  // the key here MUST be "id", because useParams returns keys matching
  // dynamic segment names. [web:2279][web:2285]
  const params = useParams<{ id: string }>();
  const jobId = typeof params?.id === 'string' ? params.id : '';

  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [mechanicStatus, setMechanicStatus] =
    useState<MechanicVerificationState>('checking');
  const [eligibility, setEligibility] = useState<EligibilityState>('checking');

  const [jobPreview, setJobPreview] = useState<JobPreview | null>(null);
  const [, setMechanicId] = useState<string | null>(null);

  const proposalCount = useMemo(() => proposal.trim().length, [proposal]);

  const quoteHints = useMemo(() => {
    if (!jobPreview) return null;
    return deriveQuoteHints(`${jobPreview.title} ${jobPreview.description ?? ''}`);
  }, [jobPreview]);

  const submitBlockedReason = useMemo(
    () => getEligibilityMessage(eligibility, jobPreview?.status ?? null),
    [eligibility, jobPreview?.status]
  );

  const canSubmit =
    !loading &&
    !success &&
    eligibility === 'ready' &&
    !!jobId &&
    isUuid(jobId);

  useEffect(() => {
    async function verifyEligibility() {
      try {
        setChecking(true);
        setError(null);
        setEligibility('checking');
        setMechanicStatus('checking');

        if (!jobId) {
          setEligibility('failed');
          setError('Missing job id.');
          return;
        }

        if (!isUuid(jobId)) {
          setEligibility('failed');
          setError(`Invalid job id: ${jobId}`);
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: mechanic, error: mechanicError } = await supabase
          .from('mechanics')
          .select('id, verified')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (mechanicError) {
          throw new Error(mechanicError.message);
        }

        if (!mechanic) {
          setMechanicStatus('missing_profile');
          setEligibility('missing_profile');
        } else if (!mechanic.verified) {
          setMechanicId(mechanic.id);
          setMechanicStatus('unverified');
          setEligibility('unverified');
        } else {
          setMechanicId(mechanic.id);
          setMechanicStatus('verified');
        }

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, description, budget, status, location, assigned_mechanic_id')
          .eq('id', jobId)
          .limit(1)
          .maybeSingle<JobPreview>();

        if (jobError) {
          throw new Error(jobError.message);
        }

        if (!job) {
          setJobPreview(null);
          setEligibility('job_not_found');
          return;
        }

        setJobPreview(job);

        if (job.status !== 'open') {
          setEligibility('job_closed');
          return;
        }

        if (job.assigned_mechanic_id) {
          setEligibility('job_assigned');
          return;
        }

        if (!mechanic) {
          return;
        }

        if (!mechanic.verified) {
          return;
        }

        const { data: existingApplication, error: existingApplicationError } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobId)
          .eq('mechanic_id', mechanic.id)
          .limit(1)
          .maybeSingle();

        if (existingApplicationError) {
          throw new Error(existingApplicationError.message);
        }

        if (existingApplication) {
          setEligibility('already_applied');
          return;
        }

        setEligibility('ready');
      } catch (err) {
        console.error(err);
        setMechanicStatus('failed');
        setEligibility('failed');
        setError(
          err instanceof Error ? err.message : 'Unable to verify mechanic or job.'
        );
      } finally {
        setChecking(false);
      }
    }

    void verifyEligibility();
  }, [jobId, router]);

  const validateForm = (): boolean => {
    setError(null);

    const bid = parseFloat(bidAmount);

    if (!jobId || !isUuid(jobId)) {
      setError('Invalid job id.');
      return false;
    }

    if (!canSubmit) {
      setError(submitBlockedReason || 'You cannot submit a quote for this job.');
      return false;
    }

    if (Number.isNaN(bid) || bid <= 0) {
      setError('Enter a valid quote amount greater than 0.');
      return false;
    }

    if (proposalCount < 24) {
      setError('Proposal must be at least 24 characters so the owner gets a useful quote.');
      return false;
    }

    if (estimatedArrival && estimatedArrival.trim().length < 2) {
      setError('Provide a realistic response window or leave it blank.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error('Not authenticated');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error('No active session token found.');
      }

      const message = estimatedArrival.trim()
        ? `${proposal.trim()}\n\nEstimated response: ${estimatedArrival.trim()}`
        : proposal.trim();

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bid_amount: parseFloat(bidAmount),
          message,
        }),
      });

      let result: { error?: string; success?: boolean } = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit quote');
      }

      setSuccess(true);
      toast.success('Quote submitted successfully');

      window.setTimeout(() => {
        router.push(`/marketplace/jobs/${jobId}`);
      }, 1600);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit quote';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={40} className="animate-spin" />
        <p>Checking quote eligibility…</p>
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      <button
        onClick={() => router.back()}
        style={styles.backBtn}
        type="button"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div style={styles.card}>
        <div style={styles.headerBlock}>
          <div style={styles.eyebrow}>Mechanic quote</div>
          <h1 style={styles.title}>Submit a repair quote</h1>
          <p style={styles.subtitle}>
            Send a clear price and response plan so the vehicle owner can compare mechanics quickly.
          </p>
        </div>

        {jobPreview && (
          <div style={styles.jobSummary}>
            <div style={styles.summaryMain}>
              <h2 style={styles.jobTitle}>{jobPreview.title}</h2>
              <p style={styles.jobDescription}>
                {jobPreview.description || 'No additional description provided.'}
              </p>
            </div>

            <div style={styles.summaryMeta}>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>Budget</span>
                <strong style={styles.metaValue}>
                  {jobPreview.budget != null ? `£${jobPreview.budget}` : 'TBD'}
                </strong>
              </div>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>Location</span>
                <strong style={styles.metaValue}>{jobPreview.location || 'Not specified'}</strong>
              </div>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>Job status</span>
                <strong style={styles.metaValue}>{jobPreview.status || 'Unknown'}</strong>
              </div>
              {quoteHints && (
                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Likely mode</span>
                  <strong style={styles.metaValue}>{quoteHints.serviceMode}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {mechanicStatus !== 'verified' && !success && (
          <div style={styles.warningBox}>
            <Info size={16} />
            <span>
              {mechanicStatus === 'missing_profile'
                ? 'You need a mechanic profile before submitting a quote.'
                : mechanicStatus === 'unverified'
                ? 'Your mechanic account is pending verification.'
                : mechanicStatus === 'failed'
                ? 'Unable to confirm your mechanic profile.'
                : 'Mechanic verification is required to continue.'}
            </span>
          </div>
        )}

        {submitBlockedReason && !success && eligibility !== 'missing_profile' && eligibility !== 'unverified' && (
          <div style={styles.warningBox}>
            <AlertCircle size={16} />
            <span>{submitBlockedReason}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Quote amount (£) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="e.g. 150.00"
              style={styles.input}
              disabled={!canSubmit}
              required
            />
          </div>

          <div style={styles.twoColumn}>
            <div style={styles.field}>
              <label style={styles.label}>Estimated response time</label>
              <input
                type="text"
                value={estimatedArrival}
                onChange={(e) => setEstimatedArrival(e.target.value)}
                placeholder="e.g. within 2 hours"
                style={styles.input}
                disabled={!canSubmit}
              />
            </div>

            <div style={styles.hintCard}>
              <div style={styles.hintRow}>
                <Clock3 size={15} />
                <span style={styles.hintTitle}>Quote guidance</span>
              </div>
              <p style={styles.hintText}>
                Include timing, likely repair scope, and why your quote is appropriate.
              </p>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Proposal *</label>
            <textarea
              rows={6}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Describe your experience, likely repair plan, whether this can be handled roadside or in workshop, and what the owner should expect next."
              style={styles.textarea}
              disabled={!canSubmit}
              required
            />
            <div style={styles.counter}>{proposalCount} characters</div>
          </div>

          {quoteHints && (
            <div style={styles.tipPanel}>
              <div style={styles.tipHeader}>
                <ShieldCheck size={16} />
                <span>Diagnostic context</span>
              </div>
              <div style={styles.tipGrid}>
                <div style={styles.tipItem}>
                  <span style={styles.tipLabel}>Urgency</span>
                  <span style={styles.tipValue}>{quoteHints.urgency}</span>
                </div>
                <div style={styles.tipItem}>
                  <span style={styles.tipLabel}>Service type</span>
                  <span style={styles.tipValue}>{quoteHints.serviceMode}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <CheckCircle2 size={16} />
              <span>Quote sent successfully. Redirecting…</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.6,
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Gavel size={18} />
            )}
            {loading ? 'Submitting…' : 'Send quote'}
          </button>
        </form>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: 'clamp(20px, 5vw, 40px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '999px',
    padding: '10px 18px',
    cursor: 'pointer',
    color: theme.colors.text.primary,
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: '32px',
    border: `1px solid ${theme.colors.border.light}`,
    padding: 'clamp(24px, 6vw, 40px)',
  },
  headerBlock: {
    marginBottom: '24px',
  },
  eyebrow: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(28px, 8vw, 36px)',
    fontWeight: 800,
    marginBottom: '8px',
    color: theme.colors.text.primary,
    lineHeight: 1.05,
  },
  subtitle: {
    fontSize: '14px',
    color: theme.colors.text.muted,
    lineHeight: 1.6,
    margin: 0,
  },
  jobSummary: {
    marginBottom: '24px',
    display: 'grid',
    gap: '16px',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '20px',
    padding: '18px',
  },
  summaryMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jobTitle: {
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: '18px',
    fontWeight: 700,
  },
  jobDescription: {
    margin: 0,
    color: theme.colors.text.secondary,
    fontSize: '14px',
    lineHeight: 1.6,
  },
  summaryMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  metaBox: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '16px',
    padding: '12px',
  },
  metaLabel: {
    display: 'block',
    fontSize: '11px',
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
    fontWeight: 700,
  },
  metaValue: {
    color: theme.colors.text.primary,
    fontSize: '14px',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 0.8fr)',
    gap: '16px',
    alignItems: 'start',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  input: {
    width: '100%',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '16px',
    padding: '14px 16px',
    color: theme.colors.text.primary,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '16px',
    padding: '14px 16px',
    resize: 'vertical',
    color: theme.colors.text.primary,
    outline: 'none',
    minHeight: '140px',
  },
  counter: {
    fontSize: '12px',
    textAlign: 'right',
    color: theme.colors.text.muted,
  },
  hintCard: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '18px',
    padding: '14px',
  },
  hintRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    color: theme.colors.text.primary,
    fontWeight: 700,
    fontSize: '13px',
  },
  hintTitle: {
    color: theme.colors.text.primary,
  },
  hintText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: '16px',
    color: theme.colors.status.critical,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: '16px',
    color: theme.colors.primary,
  },
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: `${theme.colors.status.warning}15`,
    border: `1px solid ${theme.colors.status.warning}`,
    borderRadius: '16px',
    marginBottom: '20px',
    color: theme.colors.text.primary,
  },
  tipPanel: {
    borderRadius: '18px',
    padding: '16px',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  tipHeader: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    color: theme.colors.text.primary,
    fontWeight: 700,
    fontSize: '13px',
  },
  tipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  tipItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tipLabel: {
    fontSize: '11px',
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  tipValue: {
    color: theme.colors.text.primary,
    fontSize: '14px',
    fontWeight: 600,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: '999px',
    padding: '16px 24px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  loadingContainer: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    color: theme.colors.text.primary,
    background: theme.colors.background.main,
  },
};