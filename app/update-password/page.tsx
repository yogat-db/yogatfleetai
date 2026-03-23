'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure the user is authenticated via the recovery link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      alert('Password updated! Please log in with your new password.');
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleUpdate}>
      <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>Update password</button>
    </form>
  );
}