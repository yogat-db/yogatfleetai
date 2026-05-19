'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrg } from '../hooks/useOrg';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

function getThemeValue(path: string, fallback: any) {
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
}

const bgMain = getThemeValue('colors.background.main', '#020617');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const bgElevated = getThemeValue('colors.background.elevated', '#1e293b');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const primaryColor = getThemeValue('colors.primary', '#22c55e');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');
const criticalColor = getThemeValue('colors.status.critical', '#ef4444');
const successColor = getThemeValue('colors.status.success', '#22c55e');
const warningColor = getThemeValue('colors.status.warning', '#f59e0b');

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { org, loading, error } = useOrg();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(true);

  useEffect(() => {
    if (org?.name) {
      setName(org.name);
    }
  }, [org]);

  useEffect(() => {
    let isMounted = true;

    async function loadUserEmail() {
      try {
        setEmailLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        setEmail(user?.email ?? '');
      } finally {
        if (isMounted) {
          setEmailLoading(false);
        }
      }
    }

    void loadUserEmail();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const trimmedName = name.trim();
  const originalName = org?.name?.trim() ?? '';
  const isUnchanged = trimmedName === originalName;
  const isInvalid = trimmedName.length < 2;
  const canSubmit = Boolean(org) && !saving && !isInvalid && !isUnchanged;

  const helperText = useMemo(() => {
    if (trimmedName.length === 0) return 'Enter your organization name.';
    if (trimmedName.length < 2) return 'Organization name must be at least 2 characters.';
    if (isUnchanged) return 'No changes to save yet.';
    return 'Your organization name will be updated across your workspace.';
  }, [trimmedName, isUnchanged]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!org) {
      setSaveError('No organization found.');
      return;
    }

    if (isInvalid) {
      setSaveError('Organization name must be at least 2 characters.');
      return;
    }

    if (isUnchanged) {
      setSaveError('No changes to save.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: trimmedName })
        .eq('id', org.id);

      if (error) throw error;

      setName(trimmedName);
      setSuccessMessage('Settings saved successfully.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = () => {
    router.push('/forgot-password');
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <Loader2 size={34} className="spin" />
        <p style={styles.centerText}>Loading organization settings...</p>
        <style>{`
          .spin {
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <AlertTriangle size={34} color={criticalColor} />
        <p style={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div style={styles.centered}>
        <Building2 size={34} color={warningColor} />
        <p style={styles.centerText}>No organization found.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.kicker}>Dashboard / Settings</div>
        <h1 style={styles.title}>Workspace Settings</h1>
        <p style={styles.subtitle}>
          Manage your organization profile and account security from one place.
        </p>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconWrap}>
              <Building2 size={18} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Organization</h2>
              <p style={styles.cardMeta}>Update the name shown across your workspace.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="org-name" style={styles.label}>
                Organization name
              </label>
              <input
                id="org-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (saveError) setSaveError(null);
                  if (successMessage) setSuccessMessage(null);
                }}
                style={styles.input}
                placeholder="Enter organization name"
                maxLength={80}
                aria-invalid={Boolean(saveError || isInvalid)}
              />
              <p
                style={{
                  ...styles.helperText,
                  color: isInvalid && trimmedName.length > 0 ? warningColor : textSecondary,
                }}
              >
                {helperText}
              </p>
            </div>

            {saveError && (
              <div style={styles.errorBox}>
                <AlertTriangle size={16} />
                <span>{saveError}</span>
              </div>
            )}

            {successMessage && (
              <div style={styles.successBox}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...styles.button,
                ...(!canSubmit ? styles.buttonDisabled : {}),
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconWrap}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Security</h2>
              <p style={styles.cardMeta}>
                Reset your password using your existing email recovery flow.
              </p>
            </div>
          </div>

          <div style={styles.securityPanel}>
            <div style={styles.securityRow}>
              <div style={styles.securityInfo}>
                <div style={styles.securityLabel}>Account email</div>
                <div style={styles.securityValue}>
                  {emailLoading ? 'Loading...' : email || 'Signed-in email unavailable'}
                </div>
              </div>

              <div style={styles.emailPill}>
                <Mail size={14} />
                Recovery enabled
              </div>
            </div>

            <div style={styles.noticeBox}>
              <AlertTriangle size={16} />
              <span>
                Password changes are handled through your recovery flow for better security.
              </span>
            </div>

            <button
              type="button"
              onClick={handlePasswordReset}
              style={styles.secondaryButton}
            >
              Go to Forgot Password
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: bgMain,
    minHeight: '100vh',
    color: textPrimary,
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  hero: {
    marginBottom: '28px',
  },
  kicker: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: primaryColor,
    marginBottom: '10px',
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 40px)',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    marginTop: '10px',
    color: textSecondary,
    maxWidth: '60ch',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px',
    background: bgMain,
    color: textSecondary,
  },
  centerText: {
    margin: 0,
    color: textSecondary,
  },
  errorText: {
    margin: 0,
    color: criticalColor,
  },
  card: {
    background: bgCard,
    border: `1px solid ${borderLight}`,
    borderRadius: '18px',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '20px',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${primaryColor}20`,
    color: primaryColor,
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: textPrimary,
  },
  cardMeta: {
    margin: '4px 0 0 0',
    color: textSecondary,
    fontSize: '14px',
  },
  form: {
    maxWidth: 520,
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: textSecondary,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: bgElevated,
    border: `1px solid ${borderMedium}`,
    borderRadius: 10,
    color: textPrimary,
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  helperText: {
    margin: '8px 0 0 0',
    fontSize: '13px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: primaryColor,
    color: bgMain,
    padding: '12px 18px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
    minWidth: 160,
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'transparent',
    color: textPrimary,
    padding: '12px 16px',
    borderRadius: 10,
    border: `1px solid ${borderMedium}`,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
    marginTop: '16px',
  },
  securityPanel: {
    background: bgElevated,
    border: `1px solid ${borderMedium}`,
    borderRadius: 14,
    padding: '16px',
  },
  securityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  securityInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  securityLabel: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: textSecondary,
    letterSpacing: '0.08em',
  },
  securityValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: textPrimary,
  },
  emailPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    borderRadius: 999,
    background: `${primaryColor}18`,
    border: `1px solid ${primaryColor}35`,
    color: primaryColor,
    fontSize: '12px',
    fontWeight: 700,
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    background: `${warningColor}16`,
    border: `1px solid ${warningColor}`,
    borderRadius: 10,
    color: warningColor,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: `${criticalColor}18`,
    border: `1px solid ${criticalColor}`,
    borderRadius: 10,
    color: criticalColor,
    marginBottom: '14px',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: `${successColor}18`,
    border: `1px solid ${successColor}`,
    borderRadius: 10,
    color: successColor,
    marginBottom: '14px',
  },
};