'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  BadgeCheck,
  Building2,
  Clock3,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface MechanicProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  location?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name?: string | null) {
  if (!name?.trim()) return 'ME';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'ME';
}

function getSafeParam(value: string | string[] | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default function MechanicDetailPage() {
  const router = useRouter();
  const params = useParams<{ mechanicid: string | string[] }>();

  const mechanicId = useMemo(() => getSafeParam(params?.mechanicid), [params]);

  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showRetryState = false) => {
    if (!mechanicId) {
      setError('Invalid mechanic id');
      setLoading(false);
      return;
    }

    if (showRetryState) setRetrying(true);
    else setLoading(true);

    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, location, phone, created_at')
        .eq('id', mechanicId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Mechanic profile not found');

      setProfile(data as MechanicProfile);
    } catch (err) {
      console.error('Error loading mechanic profile:', err);
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Failed to load mechanic profile');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [mechanicId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div style={styles.statePage}>
        <div style={styles.stateCard}>
          <div style={styles.loadingOrb}>
            <Loader2 className="spin" size={28} color={theme.colors.primary} />
          </div>
          <h2 style={styles.stateTitle}>Loading mechanic</h2>
          <p style={styles.stateText}>
            Fetching profile details and contact information.
          </p>
        </div>

        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @media (max-width: 820px) {
            .mechanic-profile-header {
              flex-direction: column;
              align-items: flex-start !important;
            }

            .mechanic-profile-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.statePage}>
        <div style={styles.stateCard}>
          <div style={styles.errorOrb}>
            <AlertCircle size={28} color={theme.colors.status.critical} />
          </div>

          <h2 style={styles.stateTitle}>Unable to load mechanic</h2>
          <p style={styles.stateText}>
            {error || 'The requested mechanic profile could not be found.'}
          </p>

          <div style={styles.stateActions}>
            <button
              onClick={() => void fetchProfile(true)}
              style={styles.retryButton}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <Loader2 className="spin" size={16} />
                  Trying again…
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Try again
                </>
              )}
            </button>

            <button
              onClick={() => router.push('/marketplace')}
              style={styles.secondaryButton}
            >
              Back to marketplace
            </button>
          </div>
        </div>

        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || 'Mechanic';
  const displayEmail = profile.email?.trim() || 'No email listed';
  const displayRole = profile.role?.replace(/[_-]/g, ' ') || 'Mechanic';
  const initials = getInitials(profile.full_name);

  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={styles.page}
    >
      <style>{`
        .spin { animation: spin 1s linear infinite; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 820px) {
          .mechanic-profile-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .mechanic-profile-grid {
            grid-template-columns: 1fr !important;
          }

          .mechanic-profile-meta {
            width: 100%;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        <Link href="/marketplace" style={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back to marketplace</span>
        </Link>

        <section className="mechanic-profile-header" style={styles.profileHero}>
          <div style={styles.heroMain}>
            <div style={styles.avatarShell}>
              <div style={styles.avatarLarge}>{initials}</div>
              <div style={styles.verifiedDot}>
                <BadgeCheck size={14} />
              </div>
            </div>

            <div style={styles.heroCopy}>
              <div style={styles.roleBadge}>
                <ShieldCheck size={14} />
                <span>{displayRole.toUpperCase()}</span>
              </div>

              <h1 style={styles.nameTitle}>{displayName}</h1>
              <p style={styles.emailSub}>{displayEmail}</p>

              <div className="mechanic-profile-meta" style={styles.heroMeta}>
                <div style={styles.metaChip}>
                  <Wrench size={14} />
                  <span>Verified marketplace profile</span>
                </div>
                <div style={styles.metaChip}>
                  <Clock3 size={14} />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mechanic-profile-grid" style={styles.infoGrid}>
          <article style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.sectionTitle}>Contact information</h2>
              <p style={styles.cardSubtext}>
                Primary ways to contact this mechanic.
              </p>
            </div>

            <div style={styles.stack}>
              <div style={styles.detailRow}>
                <div style={styles.iconWrap}>
                  <Mail size={18} color={theme.colors.primary} />
                </div>
                <div>
                  <div style={styles.label}>Email address</div>
                  <div style={styles.value}>{displayEmail}</div>
                </div>
              </div>

              <div style={styles.detailRow}>
                <div style={styles.iconWrap}>
                  <Phone size={18} color={theme.colors.primary} />
                </div>
                <div>
                  <div style={styles.label}>Phone</div>
                  <div style={styles.value}>{profile.phone?.trim() || 'No phone listed'}</div>
                </div>
              </div>
            </div>
          </article>

          <article style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.sectionTitle}>Profile details</h2>
              <p style={styles.cardSubtext}>
                Location, account role, and member details.
              </p>
            </div>

            <div style={styles.stack}>
              <div style={styles.detailRow}>
                <div style={styles.iconWrap}>
                  <Building2 size={18} color={theme.colors.primary} />
                </div>
                <div>
                  <div style={styles.label}>Role</div>
                  <div style={styles.value}>{displayRole}</div>
                </div>
              </div>

              <div style={styles.detailRow}>
                <div style={styles.iconWrap}>
                  <MapPin size={18} color={theme.colors.primary} />
                </div>
                <div>
                  <div style={styles.label}>Location</div>
                  <div style={styles.value}>{profile.location?.trim() || 'Location not listed'}</div>
                </div>
              </div>

              <div style={styles.detailRow}>
                <div style={styles.iconWrap}>
                  <Calendar size={18} color={theme.colors.primary} />
                </div>
                <div>
                  <div style={styles.label}>Member since</div>
                  <div style={styles.value}>{formatDate(profile.created_at)}</div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </motion.main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    padding: '24px 16px 40px',
  },
  container: {
    maxWidth: 1040,
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: theme.colors.text.secondary,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
  },
  profileHero: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 28,
    padding: '24px',
    marginBottom: 22,
    boxShadow: '0 10px 30px rgba(2, 6, 23, 0.08)',
  },
  heroMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 22,
    flexWrap: 'wrap',
  },
  avatarShell: {
    position: 'relative',
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  avatarLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    background: `${theme.colors.primary}16`,
    border: `1px solid ${theme.colors.primary}33`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: '-0.04em',
  },
  verifiedDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 999,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.primary,
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
    padding: '7px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  nameTitle: {
    fontSize: 'clamp(30px, 5vw, 44px)',
    fontWeight: 900,
    letterSpacing: '-0.05em',
    lineHeight: 1.02,
    margin: 0,
  },
  emailSub: {
    fontSize: 'clamp(14px, 3vw, 18px)',
    color: theme.colors.text.secondary,
    marginTop: 8,
    overflowWrap: 'anywhere',
  },
  heroMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    padding: '0 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: 600,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 20,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 24,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardSubtext: {
    marginTop: 6,
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: 0,
    color: theme.colors.text.primary,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  detailRow: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    background: `${theme.colors.primary}10`,
    border: `1px solid ${theme.colors.primary}18`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
    fontWeight: 800,
    letterSpacing: '0.06em',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    lineHeight: 1.55,
    color: theme.colors.text.primary,
    overflowWrap: 'anywhere',
  },
  statePage: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  stateCard: {
    width: 'min(460px, 100%)',
    borderRadius: 24,
    padding: 28,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.card,
    textAlign: 'center',
  },
  loadingOrb: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: `${theme.colors.primary}12`,
    border: `1px solid ${theme.colors.primary}24`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  errorOrb: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: `${theme.colors.status.critical}12`,
    border: `1px solid ${theme.colors.status.critical}24`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  stateTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: '-0.04em',
  },
  stateText: {
    marginTop: 8,
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 1.65,
  },
  stateActions: {
    marginTop: 18,
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  retryButton: {
    minHeight: 44,
    padding: '0 16px',
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 44,
    padding: '0 16px',
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.light}`,
    background: 'transparent',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
};