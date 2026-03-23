'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bid, setBid] = useState('');
  const [message, setMessage] = useState('');
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    checkAuthAndJob();
  }, [jobId]);

  const checkAuthAndJob = async () => {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 2. Fetch mechanic profile
    const { data: mechanic, error: mechError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (mechError || !mechanic) {
      setError('You need to register as a mechanic before applying.');
      setAuthChecked(true);
      return;
    }
    setMechanicId(mechanic.id);

    // 3. Get job title for display
    const { data: job } = await supabase
      .from('jobs')
      .select('title')
      .eq('id', jobId)
      .single();
    if (job) setJobTitle(job.title);

    // 4. Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('mechanic_id', mechanic.id)
      .maybeSingle();

    if (existing) {
      setAlreadyApplied(true);
      setError('You have already applied to this job.');
    }

    setAuthChecked(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (alreadyApplied) {
      setError('You have already applied to this job.');
      return;
    }

    if (!mechanicId) {
      setError('Mechanic profile not found.');
      return;
    }

    // Validate bid if provided
    let bidNumber: number | null = null;
    if (bid && bid.trim() !== '') {
      bidNumber = parseInt(bid, 10);
      if (isNaN(bidNumber) || bidNumber <= 0) {
        setError('Bid must be a positive number.');
        return;
      }
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('applications').insert({
        job_id: jobId,
        mechanic_id: mechanicId,
        bid_amount: bidNumber,
        message: message.trim() || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      router.push(`/marketplace/jobs/${jobId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading...</p>
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

  if (alreadyApplied) {
    return (
      <div style={styles.page}>
        <button onClick={() => router.back()} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.errorBox}>
          You have already applied to this job. You cannot submit another application.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back to Job
      </button>
      <h1 style={styles.title}>Apply to Job: {jobTitle || 'Repair Job'}</h1>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Bid (£)</label>
          <input
            type="number"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            style={styles.input}
            placeholder="Optional"
            step="1"
            min="1"
          />
          <p style={styles.hint}>Leave empty if you prefer to negotiate.</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            style={styles.textarea}
            placeholder="Introduce yourself and explain why you're a good fit..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
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
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[6],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    maxWidth: '600px',
    marginTop: theme.spacing[4],
  },
  field: {
    marginBottom: theme.spacing[6],
  },
  label: {
    display: 'block',
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[2],
  },
  input: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border 0.2s ease',
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  errorBox: {
    marginBottom: theme.spacing[5],
    padding: theme.spacing[3],
    background: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  submitButton: {
    width: '100%',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.background.main,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    marginTop: theme.spacing[2],
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
};