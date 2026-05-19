'use client';

import { useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import theme from '@/app/theme';

type DeleteJobAction = (
  jobId: string
) => Promise<{ success?: boolean; message?: string; error?: string }>;

type DeleteJobButtonProps = {
  jobId: string;
  deleteAction: DeleteJobAction;
};

export default function DeleteJobButton({
  jobId,
  deleteAction,
}: DeleteJobButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (isPending) return;

    const confirmed = window.confirm(
      'Permanently delete this job and its related applications? This cannot be undone.'
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await deleteAction(jobId);

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to delete job');
        }

        toast.success(result.message || 'Job deleted successfully');
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete job';
        toast.error(message);
      }
    });
  };

  return (
    <motion.button
      type="button"
      whileHover={isPending ? undefined : { scale: 1.04 }}
      whileTap={isPending ? undefined : { scale: 0.96 }}
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete job"
      title="Delete job"
      style={{
        ...styles.button,
        ...(isPending ? styles.buttonDisabled : {}),
      }}
    >
      {isPending ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <Trash2 size={16} />
      )}

      <style>{`
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    background: 'transparent',
    border: `1px solid ${theme.colors.status.critical}55`,
    borderRadius: '10px',
    color: theme.colors.status.critical,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.muted,
  },
};