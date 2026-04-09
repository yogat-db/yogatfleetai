// app/settings/2fa/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';
import { ArrowLeft, Shield, ShieldOff, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import theme from '@/app/theme';

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
const textMuted = getThemeValue('colors.text.muted', '#64748b');

export default function TwoFactorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  async function check2FAStatus() {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totp = factors.totp?.find(f => f.status === 'verified');
      setEnabled(!!totp);
    } catch (err: any) {
      console.error('Check 2FA error:', err);
      setError(err.message);
    }
  }

  const enable2FA = async () => {
    setError(null);
    setSuccess(null);
    setQrError(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      // Validate QR code data
      const qrString = data.totp.qr_code;
      if (!qrString || typeof qrString !== 'string') {
        throw new Error('Invalid QR code data received from server');
      }
      // Check if it's a valid otpauth URL (starts with otpauth://)
      if (!qrString.startsWith('otpauth://')) {
        console.warn('QR code does not look like a standard otpauth URL:', qrString.substring(0, 100));
        // Still try to render, but we'll fallback to manual entry if it fails
      }
      setQrCode(qrString);
      setSecret(data.totp.secret || null);
      setFactorId(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start 2FA enrollment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!factorId) {
      setError('No pending 2FA enrollment found. Please start over.');
      return;
    }
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a valid 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (error) throw error;

      setEnabled(true);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode('');
      setSuccess('Two-factor authentication enabled successfully.');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to disable two-factor authentication?\n\n' +
      'Your account will be less secure without this extra layer of protection.'
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setIsDisabling(true);
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const totp = factors.totp?.find(f => f.status === 'verified');
      if (!totp) throw new Error('No active 2FA factor found');

      const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
      if (error) throw error;

      setSuccess('Two-factor authentication has been disabled.');
      setEnabled(false);
      await check2FAStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA. Please try again.');
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setSuccess('Secret key copied to clipboard');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Safely render QR code with error fallback
  const renderQRCode = () => {
    if (!qrCode) return null;
    if (qrError) {
      return (
        <div style={styles.fallbackBox}>
          <p>QR code could not be displayed. You can manually enter this secret key in your authenticator app:</p>
          <div style={styles.secretBox}>
            <code style={styles.secretCode}>{secret || 'N/A'}</code>
            {secret && (
              <button onClick={copySecret} style={styles.copyButton}>
                <Copy size={16} /> Copy
              </button>
            )}
          </div>
        </div>
      );
    }
    try {
      // Validate QR code length (should be < 2000 chars)
      if (qrCode.length > 2000) {
        throw new Error('QR code data too large');
      }
      return (
        <div style={styles.qrContainer}>
          <QRCode value={qrCode} size={200} style={{ width: 200, height: 200 }} />
        </div>
      );
    } catch (err) {
      console.error('QR generation error:', err);
      setQrError(true);
      return renderQRCode(); // fallback to manual entry
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.page}
    >
      <div style={styles.card}>
        <div style={styles.header}>
          <button onClick={() => router.push('/settings')} style={styles.backButton}>
            <ArrowLeft size={20} />
          </button>
          <Shield size={32} color={primaryColor} />
        </div>

        <h1 style={styles.title}>Two‑Factor Authentication</h1>
        <p style={styles.description}>
          Add an extra layer of security to your account. Once enabled, you'll need a verification code from your
          authenticator app every time you sign in.
        </p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={styles.successBox}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* 2FA Disabled State */}
        {!enabled && !qrCode && (
          <div style={styles.section}>
            <div style={styles.statusBadge}>
              <ShieldOff size={16} color={errorColor} />
              <span style={{ color: errorColor }}>Disabled</span>
            </div>
            <p style={styles.infoText}>
              Two‑factor authentication is currently <strong style={{ color: errorColor }}>disabled</strong>.
              Your account is protected only by your password.
            </p>
            <button
              onClick={enable2FA}
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {/* QR Code Display (Enrollment in progress) */}
        {qrCode && (
          <div style={styles.section}>
            <h3 style={styles.subtitle}>Step 1: Scan QR Code</h3>
            <p style={styles.infoText}>
              Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to scan the code below.
            </p>
            {renderQRCode()}
            {secret && !qrError && (
              <div style={styles.manualEntryHint}>
                <p>If you can't scan the QR code, you can manually enter this key:</p>
                <code style={styles.smallSecret}>{secret.substring(0, 20)}...</code>
                <button onClick={copySecret} style={styles.smallCopyButton}>Copy</button>
              </div>
            )}
            <h3 style={styles.subtitle}>Step 2: Enter Verification Code</h3>
            <p style={styles.infoText}>
              After scanning, enter the 6‑digit code shown in your authenticator app to complete setup.
            </p>
            <div style={styles.verifySection}>
              <input
                type="text"
                placeholder="Enter 6‑digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={styles.input}
                maxLength={6}
                autoComplete="off"
              />
              <button
                onClick={verify2FA}
                disabled={loading || verifyCode.length !== 6}
                style={{
                  ...styles.verifyButton,
                  opacity: loading || verifyCode.length !== 6 ? 0.6 : 1,
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}

        {/* 2FA Enabled State */}
        {enabled && !qrCode && (
          <div style={styles.section}>
            <div style={styles.statusBadge}>
              <Shield size={16} color={primaryColor} />
              <span style={{ color: primaryColor }}>Active</span>
            </div>
            <p style={styles.infoText}>
              Two‑factor authentication is <strong style={{ color: primaryColor }}>active</strong>.
              Your account is protected with an extra layer of security.
            </p>
            <button
              onClick={disable2FA}
              disabled={isDisabling}
              style={styles.dangerButton}
            >
              {isDisabling ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        )}

        <div style={styles.helpText}>
          <p>
            <strong>Lost access to your authenticator app?</strong><br />
            Recovery codes are provided when you enable 2FA. Save them in a safe place.
            If you lose both, contact support at{' '}
            <a href="mailto:support@yogat.com" style={styles.link}>support@yogat.com</a>.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: getThemeValue('colors.background.main', '#020617'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getThemeValue('spacing.10', '40px'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  card: {
    maxWidth: '550px',
    width: '100%',
    background: bgCard,
    borderRadius: getThemeValue('borderRadius.xl', '24px'),
    border: `1px solid ${borderLight}`,
    padding: getThemeValue('spacing.8', '32px'),
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: getThemeValue('spacing.1', '4px'),
    borderRadius: getThemeValue('borderRadius.md', '8px'),
    transition: 'background 0.2s',
  },
  title: {
    fontSize: getThemeValue('fontSizes.2xl', '28px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    color: textSecondary,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    lineHeight: 1.5,
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    background: `${errorColor}20`,
    border: `1px solid ${errorColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: errorColor,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    background: `${primaryColor}20`,
    border: `1px solid ${primaryColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: primaryColor,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  section: {
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.1', '4px'),
    background: `${textMuted}20`,
    padding: `${getThemeValue('spacing.1', '4px')} ${getThemeValue('spacing.3', '12px')}`,
    borderRadius: getThemeValue('borderRadius.full', '9999px'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
    marginBottom: getThemeValue('spacing.3', '12px'),
  },
  infoText: {
    color: textSecondary,
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    lineHeight: 1.5,
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  primaryButton: {
    background: primaryColor,
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.5', '20px')}`,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    width: '100%',
  },
  dangerButton: {
    background: 'transparent',
    border: `1px solid ${errorColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.5', '20px')}`,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    color: errorColor,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    width: '100%',
  },
  verifyButton: {
    background: primaryColor,
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.5', '20px')}`,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: `${getThemeValue('spacing.5', '20px')} 0`,
    background: '#ffffff',
    padding: getThemeValue('spacing.4', '16px'),
    borderRadius: getThemeValue('borderRadius.lg', '16px'),
  },
  fallbackBox: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    padding: getThemeValue('spacing.4', '16px'),
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    margin: `${getThemeValue('spacing.5', '20px')} 0`,
    textAlign: 'center',
  },
  secretBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getThemeValue('spacing.3', '12px'),
    marginTop: getThemeValue('spacing.3', '12px'),
    background: getThemeValue('colors.background.main', '#020617'),
    padding: getThemeValue('spacing.3', '12px'),
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
  },
  secretCode: {
    fontFamily: 'monospace',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: textPrimary,
    wordBreak: 'break-all',
  },
  copyButton: {
    background: primaryColor,
    border: 'none',
    borderRadius: getThemeValue('borderRadius.md', '6px'),
    padding: `${getThemeValue('spacing.1', '4px')} ${getThemeValue('spacing.2', '8px')}`,
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.1', '4px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
  },
  manualEntryHint: {
    textAlign: 'center',
    marginTop: getThemeValue('spacing.3', '12px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: textMuted,
  },
  smallSecret: {
    fontFamily: 'monospace',
    background: getThemeValue('colors.background.main', '#020617'),
    padding: '2px 6px',
    borderRadius: getThemeValue('borderRadius.md', '4px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
  },
  smallCopyButton: {
    background: 'transparent',
    border: `1px solid ${primaryColor}`,
    borderRadius: getThemeValue('borderRadius.md', '4px'),
    padding: '2px 8px',
    color: primaryColor,
    fontSize: getThemeValue('fontSizes.xs', '10px'),
    cursor: 'pointer',
    marginLeft: getThemeValue('spacing.2', '8px'),
  },
  verifySection: {
    display: 'flex',
    gap: getThemeValue('spacing.3', '12px'),
    marginTop: getThemeValue('spacing.4', '16px'),
  },
  input: {
    flex: 1,
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.4', '16px')}`,
    color: textPrimary,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    textAlign: 'center',
    letterSpacing: '4px',
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    outline: 'none',
  },
  subtitle: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    color: textPrimary,
  },
  helpText: {
    marginTop: getThemeValue('spacing.6', '24px'),
    paddingTop: getThemeValue('spacing.4', '16px'),
    borderTop: `1px solid ${borderLight}`,
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: textMuted,
    textAlign: 'center',
  },
  link: {
    color: primaryColor,
    textDecoration: 'none',
  },
};