// app/profile/[id]/page.tsx (or wherever your route is)
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Mail, MapPin, Phone, 
  ArrowLeft, Loader2, UserCog, Calendar, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location?: string;
  phone?: string;
  created_at?: string;
}

export default function AdminDetailPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the same Mac‑safe fetch override as in your supabase client (already configured)
      // If not, we add a simple retry mechanism
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      setProfile(data);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <Loader2 className="animate-spin" size={40} color={theme.colors.primary} />
        <p style={{ marginTop: 16, color: theme.colors.text.muted }}>Loading profile...</p>
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.center}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <p style={{ margin: '16px 0', color: theme.colors.text.primary }}>
          {error || 'Profile not found'}
        </p>
        <button 
          onClick={() => fetchProfile()} 
          style={styles.retryButton}
        >
          Try Again
        </button>
        <Link href="/marketplace" style={{ color: theme.colors.primary, marginTop: '20px' }}>
          ← Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.container}>
      <Link href="/marketplace" style={styles.backLink}>
        <ArrowLeft size={18} /> Back to Directory
      </Link>

      <div style={styles.profileHeader}>
        <div style={styles.avatarLarge}>
          <UserCog size={48} />
        </div>
        <div style={styles.headerContent}>
          <div style={styles.roleBadge}>
            <ShieldCheck size={14} /> <span>{profile.role?.toUpperCase()} ACCESS</span>
          </div>
          <h1 style={styles.nameTitle}>{profile.full_name || 'Staff Member'}</h1>
          <p style={styles.emailSub}>{profile.email}</p>
        </div>
      </div>

      <div style={styles.infoGrid}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Contact Information</h2>
          <div style={styles.detailRow}>
            <Mail size={18} color={theme.colors.primary} />
            <div>
              <label style={styles.label}>Email Address</label>
              <div style={styles.value}>{profile.email}</div>
            </div>
          </div>
          <div style={styles.detailRow}>
            <Phone size={18} color={theme.colors.primary} />
            <div>
              <label style={styles.label}>Direct Line</label>
              <div style={styles.value}>{profile.phone || 'No phone listed'}</div>
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>System Details</h2>
          <div style={styles.detailRow}>
            <MapPin size={18} color={theme.colors.primary} />
            <div>
              <label style={styles.label}>Primary Location</label>
              <div style={styles.value}>{profile.location || 'Remote / HQ'}</div>
            </div>
          </div>
          <div style={styles.detailRow}>
            <Calendar size={18} color={theme.colors.primary} />
            <div>
              <label style={styles.label}>Member Since</label>
              <div style={styles.value}>
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: theme.colors.text.secondary,
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '40px',
    transition: 'color 0.2s',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    marginBottom: '48px',
    flexWrap: 'wrap',
  },
  avatarLarge: {
    width: '100px',
    height: '100px',
    borderRadius: '32px',
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.primary,
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.1)',
    color: theme.colors.primary,
    padding: '6px 14px',
    borderRadius: '100px',
    fontSize: '11px',
    fontWeight: 900,
    marginBottom: '12px',
  },
  nameTitle: {
    fontSize: 'clamp(32px, 5vw, 42px)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    margin: 0,
  },
  emailSub: {
    fontSize: 'clamp(14px, 4vw, 18px)',
    color: theme.colors.text.secondary,
    marginTop: '4px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '24px',
    padding: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    marginBottom: '24px',
    color: theme.colors.text.primary,
  },
  detailRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: '12px',
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '16px',
    color: theme.colors.text.primary,
    marginTop: '2px',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: theme.colors.text.primary,
    textAlign: 'center',
    padding: '20px',
    gap: '16px',
  },
  retryButton: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '12px',
    padding: '10px 20px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
};