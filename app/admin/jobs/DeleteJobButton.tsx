'use client';

import { useFormStatus } from 'react-dom';
import { Trash2 } from 'lucide-react';

interface DeleteJobButtonProps {
  jobId: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: 'transparent',
        border: '1px solid #ef4444',
        color: '#ef4444',
        padding: '4px',
        borderRadius: '4px',
        cursor: pending ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pending ? 0.5 : 1,
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

export default function DeleteJobButton({ jobId, deleteAction }: DeleteJobButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={jobId} />
      <SubmitButton />
    </form>
  );
}