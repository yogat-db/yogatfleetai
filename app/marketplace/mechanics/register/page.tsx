'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
// import { geocode } from '@/lib/mapbox'; // Only if you have this helper

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

      // Optional geocoding – if the helper is not available, skip it
      let lat: number | null = null;
      let lng: number | null = null;
      // if (typeof geocode === 'function') {
      //   try {
      //     const results = await geocode(address);
      //     if (results && results.length > 0) {
      //       lat = results[0].center[1];
      //       lng = results[0].center[0];
      //     }
      //   } catch (geocodeErr) {
      //     console.warn('Geocoding failed:', geocodeErr);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>
      <div style={styles.card}>
        <h1 style={styles.title}>Become a Mechanic</h1>
        <p style={styles.subtitle}>Register to receive local repair jobs and grow your business.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              <Building size={16} color="#64748b" />
              Business Name *
            </label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={styles.input} required disabled={loading} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>
              <Phone size={16} color="#64748b" />
              Phone Number
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} disabled={loading} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>
              <MapPin size={16} color="#64748b" />
              Business Address *
            </label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 High Street, Leicester, LE1 1AA" style={styles.input} required disabled={loading} />
            <p style={styles.helpText}>We'll use this to show your location on the map and match you with local jobs.</p>
          </div>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {success && <div style={styles.successBox}>✓ Registration successful! Redirecting to your dashboard...</div>}
          <button type="submit" disabled={loading || success} style={styles.submitButton}>
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
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center' },
  backButton: { position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  card: { maxWidth: '600px', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '32px', marginTop: '40px' },
  title: { fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginBottom: '24px', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#94a3b8' },
  input: { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', color: '#f1f5f9', fontSize: '16px', outline: 'none' },
  helpText: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '14px' },
  successBox: { background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px', color: '#22c55e', fontSize: '14px', textAlign: 'center' },
  submitButton: { background: '#22c55e', color: '#020617', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
  legalNote: { fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '8px' },
  link: { color: '#22c55e', textDecoration: 'none', cursor: 'pointer' },
};