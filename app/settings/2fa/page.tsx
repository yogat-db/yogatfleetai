'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';

export default function TwoFactorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

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
    setLoading(true);
    try {
      // Enroll a new TOTP factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!factorId) {
      setError('No pending enrollment found. Please start over.');
      return;
    }
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a valid 6‑digit code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        code: verifyCode,
      });
      if (error) throw error;
      setSuccess('Two‑factor authentication enabled successfully.');
      setEnabled(true);
      setQrCode(null);
      setFactorId(null);
      setVerifyCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two‑factor authentication? Your account will be less secure.')) return;
    setError(null);
    setLoading(true);
    try {
      // First get the factor ID of the verified factor
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const totp = factors.totp?.find(f => f.status === 'verified');
      if (!totp) throw new Error('No active 2FA factor found');
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
      if (error) throw error;
      setSuccess('Two‑factor authentication has been disabled.');
      setEnabled(false);
    } catch (err: any) {
      setError(err.message);
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
        <h1 style={styles.title}>Two‑Factor Authentication</h1>
        <p style={styles.description}>
          Add an extra layer of security to your account.
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {!enabled && !qrCode && (
          <div style={styles.section}>
            <p style={styles.infoText}>
              Two‑factor authentication is currently <strong style={{ color: '#ef4444' }}>disabled</strong>.
              When enabled, you will need to enter a code from your authenticator app every time you sign in.
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

        {qrCode && (
          <div style={styles.section}>
            <h3 style={styles.subtitle}>Scan this QR code</h3>
            <p style={styles.infoText}>
              Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to scan the code below.
            </p>
            <div style={styles.qrContainer}>
              <QRCode value={qrCode} size={200} style={{ width: 200, height: 200 }} />

            </div>
            <div style={styles.verifySection}>
              <input
                type="text"
                placeholder="Enter 6‑digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                style={styles.input}
                maxLength={6}
              />
              <button
                onClick={verify2FA}
                disabled={loading}
                style={styles.verifyButton}
              >
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {enabled && !qrCode && (
          <div style={styles.section}>
            <p style={styles.infoText}>
              Two‑factor authentication is <strong style={{ color: '#22c55e' }}>active</strong>.
            </p>
            <button
              onClick={disable2FA}
              disabled={loading}
              style={styles.dangerButton}
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        )}

        <div style={styles.backLink}>
          <button onClick={() => router.push('/settings')} style={styles.linkButton}>
            ← Back to Settings
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const primaryColor = '#22c55e';
const errorColor = '#ef4444';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    background: '#0f172a',
    borderRadius: '24px',
    border: '1px solid #1e293b',
    padding: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '24px',
  },
  errorBox: {
    background: `${errorColor}20`,
    border: `1px solid ${errorColor}`,
    borderRadius: '8px',
    padding: '12px',
    color: errorColor,
    fontSize: '14px',
    marginBottom: '20px',
  },
  successBox: {
    background: `${primaryColor}20`,
    border: `1px solid ${primaryColor}`,
    borderRadius: '8px',
    padding: '12px',
    color: primaryColor,
    fontSize: '14px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '24px',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  primaryButton: {
    background: primaryColor,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#020617',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
  dangerButton: {
    background: 'transparent',
    border: `1px solid ${errorColor}`,
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: errorColor,
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
  verifyButton: {
    background: primaryColor,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#020617',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0',
    background: 'white',
    padding: '16px',
    borderRadius: '16px',
  },
  verifySection: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  input: {
    flex: 1,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#f1f5f9',
  },
  backLink: {
    marginTop: '24px',
    textAlign: 'center',
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: primaryColor,
    cursor: 'pointer',
    fontSize: '14px',
  },
};
