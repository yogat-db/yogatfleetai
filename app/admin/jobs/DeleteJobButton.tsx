'use client';

import { useFormStatus } from 'react-dom';
import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import theme from '@/app/theme';

interface DeleteJobButtonProps {
  jobId: string;
  // Note: Changed return type to any to handle the response object from actions.ts
  deleteAction: (formData: FormData) => Promise<any>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <motion.button
      whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
      whileTap={{ scale: 0.95 }}
      type="submit"
      disabled={pending}
      style={{
        background: 'transparent',
        border: `1px solid ${pending ? theme.colors.border.light : '#ef4444'}`,
        color: '#ef4444',
        padding: '8px',
        borderRadius: '8px',
        cursor: pending ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pending ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {pending ? (
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Trash2 size={16} />
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.button>
  );
}

export default function DeleteJobButton({ jobId, deleteAction }: DeleteJobButtonProps) {
  
  const handleClientSideConfirm = (e: React.FormEvent<HTMLFormElement>) => {
    // Custom styled confirm could go here, but native works for speed
    if (!confirm('PROTOCOL ALERT: Are you sure you want to delete this job record? This action cannot be undone.')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteAction} onSubmit={handleClientSideConfirm}>
      {/* CRITICAL FIX: 
        The name must match what you extract in actions.ts: formData.get('jobId') 
      */}
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton />
    </form>
  );
}