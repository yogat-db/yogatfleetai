// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import { Loader2, Crosshair, MapPin } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect current address using geolocation + Mapbox reverse geocoding
  const detectCurrentAddress = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (!token) {
            setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
            setDetectingLocation(false);
            return;
          }
          // Reverse geocode using Mapbox
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${position.coords.longitude},${position.coords.latitude}.json?access_token=${token}&types=address&limit=1`
          );
          const data = await res.json();
          if (data.features && data.features.length) {
            setAddress(data.features[0].place_name);
          } else {
            setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
          }
        } catch (err) {
          console.error('Reverse geocoding failed', err);
          setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setError('Unable to detect location: ' + err.message);
        setDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            address: address || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      const userId = authData.user?.id;
      if (userId && address) {
        // 2. Store address in a profiles table (or update user metadata)
        // First, try to update user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: { address: address }
        });
        if (updateError) console.warn('Could not update user metadata:', updateError);

        // Also, create/update a profiles table entry (optional but recommended)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            address: address,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        if (profileError) console.warn('Could not create profile:', profileError);
      }

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
              minLength={6}
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

          {/* Address field with auto-detect */}
          <div style={styles.field}>
            <label style={styles.label}>
              <MapPin size={14} style={{ marginRight: '4px' }} />
              Your Location (optional)
            </label>
            <div style={styles.addressRow}>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 High Street, London"
                style={styles.addressInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={detectCurrentAddress}
                disabled={detectingLocation || loading}
                style={styles.detectButton}
              >
                {detectingLocation ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Crosshair size={16} />}
                {detectingLocation ? 'Detecting...' : 'Auto-detect'}
              </button>
            </div>
            <small style={styles.helpText}>
              We'll use this to show nearby mechanics and services.
            </small>
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

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
    maxWidth: 450,
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
    textAlign: 'center',
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
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
  },
  addressRow: {
    display: 'flex',
    gap: theme.spacing[2],
  },
  addressInput: {
    flex: 1,
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
  },
  detectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `0 ${theme.spacing[3]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
  },
  helpText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  errorBox: {
    padding: theme.spacing[2],
    background: 'rgba(239,68,68,0.1)',
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
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
    marginTop: theme.spacing[2],
  },
  loginLink: {
    marginTop: theme.spacing[4],
    textAlign: 'center',
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  link: {
    color: theme.colors.primary,
    textDecoration: 'none',
    cursor: 'pointer',
  },
};