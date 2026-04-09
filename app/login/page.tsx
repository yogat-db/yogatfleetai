// app/login/page.tsx
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
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  // Step 1: initial login (email + password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTwoFactorRequired(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // MFA required? (user has 2FA enabled)
        if (error.message?.toLowerCase().includes('mfa required') || error.status === 422) {
          // Try to get factor_id from the error object (Supabase may provide it)
          let mfaFactorId = (error as any)?.factor_id;

          if (!mfaFactorId) {
            // Fallback: list factors to find the verified TOTP factor
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
            if (!listError && factors.totp) {
              const verifiedFactor = factors.totp.find(f => f.status === 'verified');
              if (verifiedFactor) mfaFactorId = verifiedFactor.id;
            }
          }

          if (mfaFactorId) {
            setFactorId(mfaFactorId);
            setTwoFactorRequired(true);
            setLoading(false);
            return;
          } else {
            setError('Two‑factor authentication is required but no active factor found. Please contact support.');
            setLoading(false);
            return;
          }
        }

        // Other errors (wrong password, email not confirmed, etc.)
        if (error.message === 'Email not confirmed') {
          setError('Email not confirmed. Please check your inbox and click the confirmation link, or request a new one below.');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // No 2FA required – login successful
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  // Step 2: verify TOTP code
  const verify2FA = async () => {
    if (!factorId) {
      setError('No 2FA factor found. Please try logging in again.');
      return;
    }
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Please enter a valid 6‑digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Create a challenge for the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: twoFactorCode,
      });
      if (verifyError) throw verifyError;

      // After successful verification, the session is automatically set
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorRequired) {
      await verify2FA();
    } else {
      await handleLogin(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={styles.page}
    >
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome</h1>
        <p style={styles.subtitle}>Sign in to your Yogat Fleet AI account</p>

        {error && <div style={styles.errorBox}>{error}</div>}
        {resetSent && <div style={styles.successBox}>Password reset link sent! Check your email.</div>}
        {resendConfirmSent && <div style={styles.successBox}>Confirmation email sent! Please check your inbox.</div>}

        {!twoFactorRequired ? (
          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={styles.links}>
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    setError('Please enter your email address first.');
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${baseUrl}/update-password`,
                  });
                  if (error) setError(error.message);
                  else setResetSent(true);
                  setLoading(false);
                }}
                style={styles.linkButton}
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    setError('Please enter your email address first.');
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email,
                  });
                  if (error) setError(error.message);
                  else setResendConfirmSent(true);
                  setLoading(false);
                }}
                style={styles.linkButton}
              >
                Resend confirmation
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.twoFactorSection}>
            <p style={styles.twoFactorText}>
              Two‑factor authentication is enabled. Please enter the 6‑digit code from your authenticator app.
            </p>
            <div style={styles.field}>
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={styles.input}
                maxLength={6}
                autoFocus
              />
            </div>
            <button onClick={onSubmit} disabled={loading} style={styles.button}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorRequired(false);
                setFactorId(null);
                setTwoFactorCode('');
              }}
              style={styles.linkButton}
            >
              ← Back to login
            </button>
          </div>
        )}

        <div style={styles.register}>
          Don't have an account?{' '}
          <button onClick={() => router.push('/register')} style={styles.registerLink}>
            Register
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Styles (unchanged, using your theme)
const getThemeValue = (path: string, fallback: any) => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return current;
};

const primaryColor = getThemeValue('colors.primary', '#22c55e');
const errorColor = getThemeValue('colors.error', '#ef4444');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: getThemeValue('colors.background.main', '#020617'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getThemeValue('spacing.8', '32px'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    background: bgCard,
    borderRadius: getThemeValue('borderRadius.xl', '24px'),
    border: `1px solid ${borderLight}`,
    padding: getThemeValue('spacing.8', '32px'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: textSecondary,
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.5', '20px'),
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.2', '8px'),
  },
  input: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.4', '16px')}`,
    color: textPrimary,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    outline: 'none',
  },
  button: {
    background: primaryColor,
    color: getThemeValue('colors.background.main', '#020617'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: getThemeValue('spacing.2', '8px'),
  },
  errorBox: {
    background: `${errorColor}20`,
    border: `1px solid ${errorColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: errorColor,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  successBox: {
    background: `${primaryColor}20`,
    border: `1px solid ${primaryColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: primaryColor,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  links: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: getThemeValue('spacing.2', '8px'),
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  register: {
    textAlign: 'center',
    marginTop: getThemeValue('spacing.6', '24px'),
    color: textSecondary,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
  },
  registerLink: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    cursor: 'pointer',
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
  },
  twoFactorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.5', '20px'),
  },
  twoFactorText: {
    color: textSecondary,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
};