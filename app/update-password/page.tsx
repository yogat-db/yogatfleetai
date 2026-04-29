// app/update-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, [router]);

  const getPasswordStrength = (pass: string): 'weak' | 'medium' | 'strong' => {
    if (!pass) return 'weak';
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return 'weak';
    if (score === 2 || score === 3) return 'medium';
    return 'strong';
  };

  const strength = getPasswordStrength(password);
  const strengthColor = {
    weak: theme.colors.status.critical,
    medium: theme.colors.status.warning,
    strong: theme.colors.status.healthy,
  }[strength];
  const strengthLabel = { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[strength];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.glassCard}>
          <div style={styles.successBox}>
            <CheckCircle size={24} />
            <span>Password updated! Redirecting to login...</span>
          </div>
        </div>
      </div>
    );
  }

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

        <h1 style={styles.title}>Update password</h1>
        <p style={styles.subtitle}>Enter your new password</p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
            <button style={styles.closeBtn} onClick={() => setError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleUpdate} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New password</label>
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
            {password && (
              <div style={styles.passwordStrength}>
                <div style={{ ...styles.strengthBar, width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%', background: strengthColor }} />
                <span style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm new password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? <div className="spinner" /> : 'Update password'}
          </motion.button>

          <div style={styles.registerSection}>
            Remember your password?{' '}
            <button onClick={() => router.push('/login')} style={styles.registerLink}>
              Sign in
            </button>
          </div>
        </form>

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
    gap: '24px',
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
  passwordStrength: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  strengthBar: {
    height: '4px',
    borderRadius: '2px',
    transition: 'width 0.2s',
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
  registerSection: {
    textAlign: 'center',
    marginTop: '8px',
    fontSize: '13px',
    color: textSecondary,
  },
  registerLink: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
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
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: primaryColor,
    textAlign: 'center',
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
};