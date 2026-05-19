'use client';

import { useState } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import theme from '@/app/theme';

export default function ReleasePaymentButton({ jobId }: { jobId: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleRelease = async () => {
    if (!confirm('Release funds for this job? Payment will be sent to the mechanic.')) return;
    setIsPending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/admin/jobs/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Release failed');
      toast.success('Payment released');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleRelease}
      disabled={isPending}
      style={{
        background: 'transparent',
        border: `1px solid ${isPending ? theme.colors.border.light : theme.colors.primary}40`,
        borderRadius: '8px',
        padding: '6px',
        color: theme.colors.primary,
        cursor: isPending ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isPending ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {isPending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={18} />}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.button>
  );
}