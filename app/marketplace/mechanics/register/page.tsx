// app/marketplace/mechanics/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function MechanicRegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Optional geocoding – if you have Mapbox or another service, replace with your logic
  const geocodeAddress = async (addr: string): Promise<{ lat: number | null; lng: number | null }> => {
    try {
      // Example using a free Nominatim endpoint (rate‑limited – not for production)
      // For production, use Mapbox, Google Maps, or your own backend.
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`);
      if (!response.ok) return { lat: null, lng: null };
      const data = await response.json();
      if (data && data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return { lat: null, lng: null };
    } catch (err) {
      console.warn('Geocoding failed, proceeding without coordinates:', err);
      return { lat: null, lng: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Validate inputs
      if (!businessName.trim()) throw new Error('Business name is required');
      if (!address.trim()) throw new Error('Business address is required');

      // 2. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      // 3. Check if mechanic profile already exists
      const { data: existing, error: checkError } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('You have already registered as a mechanic');

      // 4. Geocode address (silent fail – optional)
      const { lat, lng } = await geocodeAddress(address);

      // 5. Insert new mechanic profile
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

      if (insertError) throw new Error(insertError.message);

      // 6. Success – redirect after delay
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
      <div style={styles.container}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={styles.card}>
          <h1 style={styles.title}>Become a Mechanic</h1>
          <p style={styles.subtitle}>
            Register to receive local repair jobs and grow your business.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>
                <Building size={16} />
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={styles.input}
                required
                disabled={loading || success}
                placeholder="e.g., Smith Auto Repairs"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                <Phone size={16} />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                disabled={loading || success}
                placeholder="Optional"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                <MapPin size={16} />
                Business Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 High Street, Leicester, LE1 1AA"
                style={styles.input}
                required
                disabled={loading || success}
              />
              <p style={styles.helpText}>
                We'll use this to show your location on the map and match you with local jobs.
              </p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={styles.successBox}>
                <CheckCircle size={16} />
                <span>Registration successful! Redirecting to your dashboard...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              style={{
                ...styles.submitButton,
                opacity: loading || success ? 0.7 : 1,
                cursor: loading || success ? 'not-allowed' : 'pointer',
              }}
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
      </div>
    </motion.div>
  );
}

// ==================== STYLES (using theme correctly) ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: theme.colors.background.main,
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: theme.fontFamilies.sans,
    padding: theme.spacing[5],
  },
  container: {
    maxWidth: '600px',
    width: '100%',
    position: 'relative',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontSize: theme.fontSizes.sm,
    transition: 'background 0.2s ease',
    marginBottom: theme.spacing[6],
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[8],
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
    background: theme.colors.background.subtle,  // fixed: was 'elevated'
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
    background: `${theme.colors.status.critical}20`, // fixed: was theme.colors.error
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.status.critical,
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
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