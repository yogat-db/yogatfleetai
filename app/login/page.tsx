// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendConfirmSent, setResendConfirmSent] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTwoFactorRequired(false);
    setLoading(true);

    try {
      // Removed invalid `persistSession` option – session persistence is set in supabase client configuration
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isMfaRequired =
          error.message?.toLowerCase().includes('mfa required') || (error as any)?.status === 422;

        if (isMfaRequired) {
          let mfaFactorId = (error as any)?.factor_id;
          if (!mfaFactorId) {
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
            if (!listError && factors && factors.totp) {
              const verifiedFactor = factors.totp.find((f) => f.status === 'verified');
              if (verifiedFactor) mfaFactorId = verifiedFactor.id;
            }
          }
          if (mfaFactorId) {
            setFactorId(mfaFactorId);
            setTwoFactorRequired(true);
            setLoading(false);
            return;
          } else {
            setError('Two‑factor authentication required but no active factor found.');
            setLoading(false);
            return;
          }
        }

        setError(
          error.message === 'Email not confirmed'
            ? 'Email not confirmed. Please check your inbox or request a new confirmation link.'
            : error.message
        );
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!factorId) {
      setError('No 2FA factor found. Please log in again.');
      return;
    }
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Please enter a valid 6‑digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: twoFactorCode,
      });
      if (verifyError) throw verifyError;
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

  const handleForgotPassword = async () => {
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
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) setError(error.message);
    else setResendConfirmSent(true);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={styles.page}
    >
      <div style={styles.glassCard}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>Y</div>
          <span style={styles.logoText}>Yogat Fleet AI</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to manage your fleet</p>

        {(error || resetSent || resendConfirmSent) && (
          <div style={error ? styles.errorBox : styles.successBox}>
            {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{error || (resetSent ? 'Password reset link sent! Check your email.' : 'Confirmation email sent!')}</span>
            <button style={styles.closeBtn} onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!twoFactorRequired ? (
          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.optionsRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button type="button" onClick={handleForgotPassword} style={styles.linkButton}>
                Forgot password?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </motion.button>

            <div style={styles.divider}>
              <hr style={styles.dividerLine} />
              <span>or continue with</span>
              <hr style={styles.dividerLine} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={styles.socialButton}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div style={styles.registerSection}>
              Don't have an account?{' '}
              <button onClick={() => router.push('/register')} style={styles.registerLink}>
                Create account
              </button>
            </div>

            {resetSent && (
              <p style={styles.helperText}>
                Didn't receive the email?{' '}
                <button onClick={handleResendConfirmation} style={styles.textLink}>Resend confirmation</button>
              </p>
            )}
          </form>
        ) : (
          <div style={styles.twoFactorSection}>
            <div style={styles.twoFactorIcon}>
              <Shield size={32} color={theme.colors.primary} />
            </div>
            <p style={styles.twoFactorText}>
              Enter the 6‑digit code from your authenticator app.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Verification code</label>
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
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onSubmit}
              disabled={loading}
              style={styles.button}
            >
              {loading ? <div className="spinner" /> : 'Verify & Sign In'}
            </motion.button>
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

        <style>{`
          .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(0,0,0,0.3);
            border-top: 2px solid #020617;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </motion.div>
  );
}

const getThemeValue = (path: string, fallback: any) => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else return fallback;
  }
  return current;
};

const primaryColor = getThemeValue('colors.primary', '#22c55e');
const bgMain = getThemeValue('colors.background.main', '#020617');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');
const textMuted = getThemeValue('colors.text.muted', '#64748b');

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: bgMain,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  glassCard: {
    maxWidth: '460px',
    width: '100%',
    background: `rgba(15, 23, 42, 0.8)`,
    backdropFilter: 'blur(12px)',
    borderRadius: '32px',
    border: `1px solid rgba(255,255,255,0.08)`,
    padding: '40px 32px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: primaryColor,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
    color: bgMain,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: textPrimary,
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '8px',
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #f8fafc, #94a3b8)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
  subtitle: {
    color: textSecondary,
    textAlign: 'center',
    marginBottom: '32px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: textSecondary,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: textMuted,
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    background: 'rgba(2, 6, 23, 0.6)',
    border: `1px solid ${borderMedium}`,
    borderRadius: '14px',
    color: textPrimary,
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    background: 'transparent',
    border: 'none',
    color: textMuted,
    cursor: 'pointer',
  },
  optionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: textSecondary,
    cursor: 'pointer',
  },
  button: {
    background: primaryColor,
    border: 'none',
    borderRadius: '14px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 700,
    color: bgMain,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    margin: '16px 0 8px',
    color: textMuted,
    fontSize: '11px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: borderLight,
    border: 'none',
  },
  socialButton: {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${borderMedium}`,
    borderRadius: '14px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 500,
    color: textPrimary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    transition: 'background 0.2s',
  },
  registerSection: {
    textAlign: 'center',
    marginTop: '16px',
    fontSize: '13px',
    color: textSecondary,
  },
  registerLink: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBox: {
    background: `${getThemeValue('colors.status.critical', '#ef4444')}15`,
    border: `1px solid ${getThemeValue('colors.status.critical', '#ef4444')}`,
    borderRadius: '14px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: getThemeValue('colors.status.critical', '#ef4444'),
    marginBottom: '24px',
    position: 'relative',
  },
  successBox: {
    background: `${primaryColor}15`,
    border: `1px solid ${primaryColor}`,
    borderRadius: '14px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: primaryColor,
    marginBottom: '24px',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '18px',
    cursor: 'pointer',
  },
  twoFactorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  twoFactorIcon: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  twoFactorText: {
    color: textSecondary,
    fontSize: '14px',
    textAlign: 'center',
  },
  helperText: {
    fontSize: '12px',
    textAlign: 'center',
    marginTop: '16px',
    color: textMuted,
  },
  textLink: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};