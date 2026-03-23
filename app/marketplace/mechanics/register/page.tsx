// app/marketplace/mechanics/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// Optional geocoding – if you don't have Mapbox set up, you can comment this out
// import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
// const geocodingClient = mbxGeocoding({ accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN! });

export default function MechanicRegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!businessName.trim()) throw new Error('Business name is required');
      if (!address.trim()) throw new Error('Address is required');

      // Optional: geocode address to get lat/lng (if you have Mapbox)
      let lat: number | null = null;
      let lng: number | null = null;
      // if (address.trim()) {
      //   try {
      //     const response = await geocodingClient
      //       .forwardGeocode({ query: address, limit: 1 })
      //       .send();
      //     if (response.body.features.length) {
      //       [lng, lat] = response.body.features[0].center;
      //     }
      //   } catch (geoErr) {
      //     console.warn('Geocoding failed, proceeding without coordinates', geoErr);
      //   }
      // }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      const { error: insertError } = await supabase.from('mechanics').insert({
        user_id: user.id,
        business_name: businessName.trim(),
        phone: phone.trim() || null,
        address: address.trim(),
        lat,
        lng,
        verified: false,
        subscription_status: 'inactive',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push('/marketplace/mechanics/dashboard'), 2000);
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
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>
      <div style={styles.card}>
        <h1 style={styles.title}>Become a Mechanic</h1>
        <p style={styles.subtitle}>
          Register to receive local repair jobs and grow your business.
        </p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              <Building size={16} color={theme.colors.text.muted} />
              Business Name *
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>
              <Phone size={16} color={theme.colors.text.muted} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>
              <MapPin size={16} color={theme.colors.text.muted} />
              Business Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 High Street, Leicester, LE1 1AA"
              style={styles.input}
              required
              disabled={loading}
            />
            <p style={styles.helpText}>
              We'll use this to show your location on the map and match you with local jobs.
            </p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              ✓ Registration successful! Redirecting to your dashboard...
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            style={styles.submitButton}
          >
            {loading ? 'Registering...' : 'Register as Mechanic'}
          </button>

          <p style={styles.legalNote}>
            By registering, you agree to our{' '}
            <a href="/terms" style={styles.link}>Terms of Service</a> and{' '}
            <a href="/privacy" style={styles.link}>Privacy Policy</a>.
          </p>
        </form>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    display: 'flex',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing[5],
    left: theme.spacing[5],
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[8],
    marginTop: theme.spacing[10],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[6],
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[5],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  input: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    outline: 'none',
    transition: 'border 0.2s ease',
  },
  helpText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
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
    textAlign: 'center',
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
    marginTop: theme.spacing[2],
  },
  legalNote: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: theme.spacing[4],
  },
  link: {
    color: theme.colors.primary,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
};
