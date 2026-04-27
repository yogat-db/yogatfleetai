// app/marketplace/jobs/[jobId]/apply/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Gavel, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function ApplyJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [mechanicVerified, setMechanicVerified] = useState<boolean | null>(null);
  const [checkingMechanic, setCheckingMechanic] = useState(true);

  // Check mechanic status on mount
  useEffect(() => {
    async function checkMechanic() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id, verified')
          .eq('user_id', user.id)
          .single();

        if (!mechanic) {
          setMechanicVerified(false);
          setError('No mechanic profile found. Please complete registration first.');
        } else if (!mechanic.verified) {
          setMechanicVerified(false);
          setError('Your mechanic account is pending verification. Please contact support.');
        } else {
          setMechanicVerified(true);
        }
      } catch (err) {
        setMechanicVerified(false);
        setError('Unable to verify mechanic status. Please try again.');
      } finally {
        setCheckingMechanic(false);
      }
    }
    checkMechanic();
  }, [router]);

  const validateForm = (): boolean => {
    const bid = parseFloat(bidAmount);
    if (isNaN(bid) || bid <= 0) {
      setError('Please enter a valid bid amount greater than 0');
      return false;
    }
    if (!proposal.trim() || proposal.trim().length < 10) {
      setError('Proposal must be at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!mechanicVerified) {
      setError('Mechanic profile is required to submit a bid');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid_amount: parseFloat(bidAmount),
          message: proposal.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit application');

      setSuccess(true);
      setTimeout(() => router.push(`/marketplace/jobs/${jobId}`), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading skeleton while checking mechanic
  if (checkingMechanic) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={40} color={theme.colors.primary} />
        <p style={styles.loadingText}>Verifying mechanic status...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      <button onClick={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={16} /> Back
      </button>

      <header style={styles.header}>
        <h1 style={styles.title}>Submit Bid</h1>
        <p style={styles.subtitle}>Job ID: {jobId?.slice(0, 8)}</p>
      </header>

      <div style={styles.card}>
        {!mechanicVerified && !success && (
          <div style={styles.warningBox}>
            <Info size={16} />
            <span>You need a verified mechanic profile to submit bids.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Bid Amount (£)</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              style={styles.input}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              disabled={loading || success || !mechanicVerified}
              placeholder="e.g., 150.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Proposal</label>
            <textarea
              required
              style={styles.textarea}
              rows={5}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              disabled={loading || success || !mechanicVerified}
              placeholder="Describe your experience, timeline, and why you're the right mechanic for this job..."
            />
            <div style={styles.counter}>
              {proposal.trim().length}/10 minimum characters
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={styles.errorBox}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={styles.successBox}
              >
                <CheckCircle size={16} />
                <span>Application sent successfully! Redirecting...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || success || !mechanicVerified}
            style={{
              ...styles.submitBtn,
              opacity: loading || success || !mechanicVerified ? 0.6 : 1,
              cursor: loading || success || !mechanicVerified ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Gavel size={18} />
                Send Bid
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 20px',
    maxWidth: '600px',
    margin: '0 auto',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  backBtn: {
    background: 'none',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    cursor: 'pointer',
    marginBottom: theme.spacing[6],
    transition: 'all 0.2s',
  },
  header: {
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: 900,
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    color: theme.colors.text.muted,
    fontSize: theme.fontSizes.sm,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[6],
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[5],
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  label: {
    fontSize: theme.fontSizes.xs,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme.colors.text.muted,
  },
  input: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
  },
  counter: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    textAlign: 'right',
    marginTop: theme.spacing[1],
  },
  errorBox: {
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.status.critical,
    fontSize: theme.fontSizes.sm,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  successBox: {
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  warningBox: {
    background: `${theme.colors.status.warning}15`,
    border: `1px solid ${theme.colors.status.warning}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.status.warning,
    fontSize: theme.fontSizes.sm,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  submitBtn: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    fontWeight: 900,
    fontSize: theme.fontSizes.base,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[2],
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  loadingContainer: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
  },
  loadingText: {
    color: theme.colors.text.secondary,
  },
};