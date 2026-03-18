'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import QRCode from 'qrcode.react'
import { supabase } from '@/lib/supabase/client'

export default function TwoFactorPage() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const verified = data?.totp.some(f => f.status === 'verified') ?? false
      setEnabled(verified)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const enable2FA = async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verify2FA = async () => {
    if (!factorId) {
      setError('No pending 2FA enrollment found. Please start over.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        code: verifyCode,
      })
      if (error) throw error
      setEnabled(true)
      setQrCode(null)
      setFactorId(null)
      setVerifyCode('')
      setSuccess('Two‑factor authentication enabled successfully.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    setError(null)
    setLoading(true)
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError
      const verified = factors?.totp.find(f => f.status === 'verified')
      if (!verified) throw new Error('No active 2FA factor found')
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
      if (error) throw error
      setEnabled(false)
      setSuccess('Two‑factor authentication disabled.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Two‑Factor Authentication</h1>
      <div style={styles.card}>
        {enabled ? (
          <>
            <p style={styles.info}>
              Two‑factor authentication is currently <strong style={{ color: '#22c55e' }}>ENABLED</strong>.
            </p>
            <button
              onClick={disable2FA}
              disabled={loading}
              style={styles.disableButton}
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </>
        ) : qrCode ? (
          <>
            <p style={styles.info}>
              Scan this QR code with your authenticator app (e.g., Google Authenticator).
            </p>
            <div style={styles.qrContainer}>
              <QRCode value={qrCode} size={200} fgColor="#22c55e" bgColor="#0f172a" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                style={styles.input}
                placeholder="Enter 6‑digit code"
                disabled={loading}
              />
            </div>
            <button
              onClick={verify2FA}
              disabled={loading || verifyCode.length !== 6}
              style={styles.verifyButton}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.info}>
              Two‑factor authentication adds an extra layer of security to your account.
            </p>
            <button
              onClick={enable2FA}
              disabled={loading}
              style={styles.enableButton}
            >
              {loading ? 'Preparing...' : 'Enable 2FA'}
            </button>
          </>
        )}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}
      </div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '32px',
  },
  card: {
    maxWidth: '500px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
  },
  info: {
    marginBottom: '20px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  qrContainer: {
    background: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px',
    color: '#f1f5f9',
    fontSize: '16px',
    textAlign: 'center' as const,
  },
  enableButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    width: '100%',
    fontWeight: 600,
    cursor: 'pointer',
  },
  verifyButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    width: '100%',
    fontWeight: 600,
    cursor: 'pointer',
  },
  disableButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    width: '100%',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  successBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    color: '#22c55e',
  },
}