'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendConfirmSent, setResendConfirmSent] = useState(false);

  // Determine the base URL for redirects (use environment variable, fallback to current origin)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === 'Email not confirmed') {
        setError('Email not confirmed. Please check your inbox and click the confirmation link, or request a new one below.');
      } else {
        setError(error.message);
      }
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/update-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) {
      setError(error.message);
    } else {
      setResendConfirmSent(true);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Log in to your account</p>

        <form onSubmit={handleLogin} style={styles.form}>
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

          {error && (
            <div style={styles.errorBox}>
              {error}
              {error.includes('Email not confirmed') && (
                <button onClick={handleResendConfirmation} style={styles.resendButton}>
                  Resend confirmation
                </button>
              )}
            </div>
          )}

          {resetSent && (
            <div style={styles.successBox}>
              Password reset email sent! Check your inbox.
            </div>
          )}

          {resendConfirmSent && (
            <div style={styles.successBox}>
              Confirmation email resent! Check your inbox.
            </div>
          )}

          <div style={styles.buttons}>
            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={styles.forgotButton}
            >
              Forgot password?
            </button>
          </div>
        </form>

        <p style={styles.registerLink}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/register')}
            style={styles.linkButton}
          >
            Create account
          </button>
        </p>
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
    maxWidth: '400px',
    width: '100%',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
    boxShadow: theme.shadows.lg,
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
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
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border 0.2s ease',
  },
  errorBox: {
    background: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  submitButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    width: '100%',
  },
  forgotButton: {
    background: 'transparent',
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    width: '100%',
  },
  registerLink: {
    textAlign: 'center',
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[6],
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    fontSize: 'inherit',
  },
  resendButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    marginTop: theme.spacing[2],
    fontSize: theme.fontSizes.xs,
  },
};