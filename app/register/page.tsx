'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`, // optional
        },
      });

      if (signUpError) throw signUpError;

      // The database trigger will automatically create a profile row.
      // No manual insert needed.
      // Redirect to login with success message
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          {error && <div style={styles.errorBox}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
          <p style={styles.loginLink}>
            Already have an account?{' '}
            <a href="/login" style={styles.link}>Login</a>
          </p>
        </form>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    padding: theme.spacing[4],
  },
  card: {
    maxWidth: 400,
    width: '100%',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[6],
    textAlign: 'center' as const,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[4],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[1],
  },
  label: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  input: {
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: theme.transitions.default,
    ':focus': {
      borderColor: theme.colors.primary,
    },
  },
  errorBox: {
    padding: theme.spacing[2],
    background: 'rgba(239,68,68,0.1)',
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center' as const,
  },
  submitButton: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: theme.transitions.default,
    ':hover': {
      background: theme.colors.primaryDark,
      transform: 'scale(1.02)',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
  loginLink: {
    marginTop: theme.spacing[4],
    textAlign: 'center' as const,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  link: {
    color: theme.colors.primary,
    textDecoration: 'none',
    cursor: 'pointer',
    ':hover': {
      textDecoration: 'underline',
    },
  },
};