'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.card}
      >
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Sign in to Yogat Fleet AI</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link href="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
    padding: '20px',
  },
  card: {
    maxWidth: 400,
    width: '100%',
    background: '#0f172a',
    borderRadius: 24,
    border: '1px solid #1e293b',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  button: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '12px',
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '24px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  link: {
    color: '#22c55e',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
