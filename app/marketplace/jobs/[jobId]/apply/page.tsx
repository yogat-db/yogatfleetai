'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Gavel, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

export default function ApplyJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mechanicVerified, setMechanicVerified] = useState<boolean | null>(null);
  const [checkingMechanic, setCheckingMechanic] = useState(true);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  useEffect(() => {
    async function verifyMechanicAndJob() {
      try {
        setCheckingMechanic(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id, verified')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!mechanic) {
          setMechanicVerified(false);
          setError('No mechanic profile found. Please complete registration first.');
        } else if (!mechanic.verified) {
          setMechanicVerified(false);
          setError('Your mechanic account is pending verification.');
        } else {
          setMechanicVerified(true);
        }
        const { data: job } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .maybeSingle();
        if (job) {
          setJobStatus(job.status);
          if (job.status !== 'open') setError(`This job is already ${job.status}. Cannot apply.`);
        }
      } catch (err) { console.error(err); }
      finally { setCheckingMechanic(false); }
    }
    verifyMechanicAndJob();
  }, [jobId, router]);

  const validateForm = (): boolean => {
    const bid = parseFloat(bidAmount);
    if (isNaN(bid) || bid <= 0) { setError('Enter a valid bid amount greater than 0.'); return false; }
    if (!proposal.trim() || proposal.trim().length < 10) { setError('Proposal must be at least 10 characters.'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!mechanicVerified) { setError('Mechanic profile required to submit a bid.'); return; }
    if (jobStatus !== 'open') { setError(`Job is already ${jobStatus}. Cannot apply.`); return; }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bid_amount: parseFloat(bidAmount),
          message: proposal.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit application');

      setSuccess(true);
      toast.success('Bid submitted successfully!');
      setTimeout(() => router.push(`/marketplace/jobs/${jobId}`), 2000);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingMechanic) {
    return <div style={styles.loadingContainer}><Loader2 size={40} className="animate-spin" /><p>Verifying...</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      <button onClick={() => router.back()} style={styles.backBtn}><ArrowLeft size={16} /> Back</button>
      <div style={styles.card}>
        <h1 style={styles.title}>Submit a Bid</h1>
        <p style={styles.subtitle}>Job ID: {jobId?.slice(0, 8)}</p>
        {!mechanicVerified && !success && <div style={styles.warningBox}><Info size={16} />Need a verified mechanic profile to bid.</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Bid Amount (£) *</label>
            <input type="number" step="0.01" min="0.01" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="e.g., 150.00" style={styles.input} disabled={loading || success || !mechanicVerified || jobStatus !== 'open'} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Proposal *</label>
            <textarea rows={4} value={proposal} onChange={e => setProposal(e.target.value)} placeholder="Describe your experience, timeline, and why you're the right mechanic..." style={styles.textarea} disabled={loading || success || !mechanicVerified || jobStatus !== 'open'} required />
            <div style={styles.counter}>{proposal.trim().length} / 10 min characters</div>
          </div>
          {error && <div style={styles.errorBox}><AlertCircle size={16} /> {error}</div>}
          {success && <div style={styles.successBox}><CheckCircle size={16} /> Application sent! Redirecting...</div>}
          <button type="submit" disabled={loading || success || !mechanicVerified || jobStatus !== 'open'} style={{ ...styles.submitBtn, opacity: loading || success || !mechanicVerified || jobStatus !== 'open' ? 0.6 : 1 }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Gavel size={18} />}
            {loading ? 'Submitting...' : 'Send Bid'}
          </button>
        </form>
      </div>
      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '600px', margin: '0 auto', padding: 'clamp(20px,5vw,40px)', background: theme.colors.background.main, minHeight: '100vh' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: '40px', padding: '8px 20px', cursor: 'pointer' },
  card: { background: theme.colors.background.card, borderRadius: '32px', border: `1px solid ${theme.colors.border.light}`, padding: 'clamp(24px,6vw,48px)' },
  title: { fontSize: 'clamp(28px,8vw,36px)', fontWeight: 800, marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: theme.colors.text.muted, marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: 600, color: theme.colors.text.secondary, textTransform: 'uppercase' },
  input: { width: '100%', background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '16px', padding: '14px 16px', color: theme.colors.text.primary },
  textarea: { width: '100%', background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '16px', padding: '14px 16px', resize: 'vertical' },
  counter: { fontSize: '12px', textAlign: 'right', color: theme.colors.text.muted },
  errorBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: `${theme.colors.status.critical}15`, border: `1px solid ${theme.colors.status.critical}`, borderRadius: '16px', color: theme.colors.status.critical },
  successBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: `${theme.colors.primary}20`, border: `1px solid ${theme.colors.primary}`, borderRadius: '16px', color: theme.colors.primary },
  warningBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: `${theme.colors.status.warning}15`, border: `1px solid ${theme.colors.status.warning}`, borderRadius: '16px', marginBottom: '24px' },
  submitBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: theme.colors.primary, color: theme.colors.background.main, border: 'none', borderRadius: '40px', padding: '16px 24px', fontWeight: 800, cursor: 'pointer' },
  loadingContainer: { minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' },
};