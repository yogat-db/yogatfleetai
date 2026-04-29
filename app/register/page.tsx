// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  // Password strength check
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

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthColor = {
    weak: theme.colors.status.critical,
    medium: theme.colors.status.warning,
    strong: theme.colors.status.healthy,
  }[passwordStrength];

  const passwordStrengthLabel = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  }[passwordStrength];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          emailRedirectTo: `${baseUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        setError('User already registered. Please sign in.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.glassCard}>
          <div style={styles.successBox}>
            <CheckCircle size={24} />
            <span>Check your email for a confirmation link. Redirecting to login...</span>
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

        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Get started with Yogat Fleet AI</p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
            <button style={styles.closeBtn} onClick={() => setError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full name</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>
          </div>

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
            <label style={styles.label}>Phone (optional)</label>
            <div style={styles.inputWrapper}>
              <Phone size={18} style={styles.inputIcon} />
              <input
                type="tel"
                placeholder="+44 123 456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
            {password && (
              <div style={styles.passwordStrength}>
                <div style={{ ...styles.strengthBar, width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%', background: passwordStrengthColor }} />
                <span style={{ color: passwordStrengthColor }}>{passwordStrengthLabel}</span>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>I accept the <button type="button" onClick={() => router.push('/terms')} style={styles.linkButtonInline}>Terms of Service</button> and <button type="button" onClick={() => router.push('/privacy')} style={styles.linkButtonInline}>Privacy Policy</button></span>
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? <div className="spinner" /> : 'Create account'}
          </motion.button>

          <div style={styles.divider}>
            <hr style={styles.dividerLine} />
            <span>or sign up with</span>
            <hr style={styles.dividerLine} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
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
            Already have an account?{' '}
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

// ==================== STYLES (same as login page, adapted) ====================
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
    maxWidth: '500px',
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
  checkboxRow: {
    marginTop: '4px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: textSecondary,
    fontSize: '12px',
    cursor: 'pointer',
  },
  linkButtonInline: {
    background: 'none',
    border: 'none',
    color: primaryColor,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '12px',
    padding: 0,
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