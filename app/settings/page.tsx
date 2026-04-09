// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { User, Bell, Shield, MessageCircle, FileText, LogOut } from 'lucide-react';
import theme from '@/app/theme';

type Tab = 'profile' | 'notifications' | 'security' | 'support' | 'legal';

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
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const borderLight = getThemeValue('colors.border.light', '#1e293b');

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportResponse, setSupportResponse] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    fetchUser();
    loadNotificationPrefs();
  }, []);

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    setFullName(user.user_metadata?.full_name || '');
  }

  async function loadNotificationPrefs() {
    // Load from localStorage or a database table (simplified)
    const prefs = localStorage.getItem('notifications_prefs');
    if (prefs) {
      const { email, push } = JSON.parse(prefs);
      setEmailNotifications(email);
      setPushNotifications(push);
    }
  }

  async function saveNotificationPrefs(email: boolean, push: boolean) {
    localStorage.setItem('notifications_prefs', JSON.stringify({ email, push }));
    // Optionally save to a settings table in Supabase
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportLoading(true);
    setSupportResponse('');
    try {
      const res = await fetch('/api/ai/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI service unavailable');
      setSupportResponse(data.reply);
    } catch (err: any) {
      setSupportResponse(err.message);
    } finally {
      setSupportLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'support', label: 'Support', icon: MessageCircle },
    { id: 'legal', label: 'Legal', icon: FileText },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.page}
    >
      <div style={styles.container}>
        <h1 style={styles.title}>Settings</h1>
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ y: -2 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                borderBottom: activeTab === tab.id ? `2px solid ${primaryColor}` : 'none',
                color: activeTab === tab.id ? primaryColor : textSecondary,
              }}
            >
              <tab.icon size={16} style={{ marginRight: '8px' }} />
              {tab.label}
            </motion.button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={styles.content}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={updateProfile} style={styles.form}>
              <div style={styles.field}>
                <label>Email</label>
                <input type="email" value={user?.email || ''} disabled style={styles.inputDisabled} />
                <small style={styles.small}>Email cannot be changed here. Contact support.</small>
              </div>
              <div style={styles.field}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={styles.input}
                />
              </div>
              {message && (
                <div style={{ ...styles.message, background: message.type === 'success' ? `${primaryColor}20` : '#ef444420', color: message.type === 'success' ? primaryColor : '#ef4444' }}>
                  {message.text}
                </div>
              )}
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <p style={styles.sectionDesc}>Manage how you receive updates and alerts.</p>
              <div style={styles.option}>
                <label style={styles.optionLabel}>Email Notifications</label>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => {
                    setEmailNotifications(e.target.checked);
                    saveNotificationPrefs(e.target.checked, pushNotifications);
                  }}
                  style={styles.checkbox}
                />
              </div>
              <div style={styles.option}>
                <label style={styles.optionLabel}>Push Notifications (Desktop & Mobile)</label>
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => {
                    setPushNotifications(e.target.checked);
                    saveNotificationPrefs(emailNotifications, e.target.checked);
                  }}
                  style={styles.checkbox}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <div style={styles.securityItem}>
                <div>
                  <h3 style={styles.securityTitle}>Password</h3>
                  <p style={styles.securityDesc}>Change your password</p>
                </div>
                <button
                  onClick={() => router.push('/settings/change-password')}
                  style={styles.secondaryButton}
                >
                  Update
                </button>
              </div>
              <div style={styles.securityItem}>
                <div>
                  <h3 style={styles.securityTitle}>Two-Factor Authentication</h3>
                  <p style={styles.securityDesc}>Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={() => router.push('/settings/2fa')}
                  style={styles.secondaryButton}
                >
                  Manage
                </button>
              </div>
              <div style={styles.securityItem}>
                <div>
                  <h3 style={styles.securityTitle}>Sign out</h3>
                  <p style={styles.securityDesc}>Log out of your account</p>
                </div>
                <button onClick={handleLogout} style={styles.dangerButton}>
                  <LogOut size={16} style={{ marginRight: '8px' }} />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div>
              <h3 style={styles.subtitle}>AI Customer Service</h3>
              <p style={styles.sectionDesc}>Ask our AI assistant for help 24/7.</p>
              <form onSubmit={handleSupportSubmit} style={styles.aiChat}>
                <textarea
                  placeholder="Describe your issue..."
                  rows={3}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  style={styles.textarea}
                  disabled={supportLoading}
                />
                <button type="submit" disabled={supportLoading} style={styles.button}>
                  {supportLoading ? 'Thinking...' : 'Send to AI Assistant'}
                </button>
              </form>
              {supportResponse && (
                <div style={styles.aiResponse}>
                  <strong>AI Response:</strong>
                  <p>{supportResponse}</p>
                </div>
              )}
              <hr style={styles.divider} />
              <p style={styles.textCenter}>
                Need human help?{' '}
                <Link href="/contact" style={styles.link}>Contact support</Link> or visit our{' '}
                <Link href="/help" style={styles.link}>Help Center</Link>.
              </p>
            </div>
          )}

          {/* Legal Tab */}
          {activeTab === 'legal' && (
            <div>
              <h3 style={styles.subtitle}>Legal Documents</h3>
              <div style={styles.legalItem}>
                <FileText size={20} color={primaryColor} />
                <div>
                  <Link href="/terms" style={styles.link}>Terms of Service</Link>
                  <p style={styles.legalDesc}>Our terms and conditions for using the platform.</p>
                </div>
              </div>
              <div style={styles.legalItem}>
                <FileText size={20} color={primaryColor} />
                <div>
                  <Link href="/privacy" style={styles.link}>Privacy Policy</Link>
                  <p style={styles.legalDesc}>How we collect, use, and protect your data.</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: getThemeValue('colors.background.main', '#020617'),
    padding: getThemeValue('spacing.10', '40px'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  container: {
    maxWidth: 800,
    margin: '0 auto',
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: getThemeValue('spacing.8', '32px'),
  },
  tabs: {
    display: 'flex',
    gap: getThemeValue('spacing.6', '24px'),
    borderBottom: `1px solid ${borderLight}`,
    marginBottom: getThemeValue('spacing.8', '32px'),
    flexWrap: 'wrap',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: `${getThemeValue('spacing.2', '8px')} 0`,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    background: bgCard,
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    border: `1px solid ${borderLight}`,
    padding: getThemeValue('spacing.8', '32px'),
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.6', '24px'),
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.2', '8px'),
  },
  input: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.medium', '#334155')}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.4', '16px')}`,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontSize: getThemeValue('fontSizes.base', '16px'),
    outline: 'none',
  },
  inputDisabled: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.medium', '#334155')}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.4', '16px')}`,
    color: getThemeValue('colors.text.muted', '#64748b'),
    fontSize: getThemeValue('fontSizes.base', '16px'),
    cursor: 'not-allowed',
  },
  small: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  button: {
    background: primaryColor,
    color: getThemeValue('colors.background.main', '#020617'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.3', '12px')} ${getThemeValue('spacing.5', '20px')}`,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    cursor: 'pointer',
    width: 'fit-content',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    background: 'transparent',
    border: `1px solid ${getThemeValue('colors.border.medium', '#334155')}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dangerButton: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: `1px solid ${getThemeValue('colors.error', '#ef4444')}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    color: getThemeValue('colors.error', '#ef4444'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  message: {
    padding: getThemeValue('spacing.3', '12px'),
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  optionLabel: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
    accentColor: primaryColor,
  },
  securityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${getThemeValue('spacing.4', '16px')} 0`,
    borderBottom: `1px solid ${borderLight}`,
  },
  securityTitle: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    margin: 0,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  securityDesc: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    margin: '4px 0 0',
  },
  subtitle: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
  sectionDesc: {
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  textarea: {
    width: '100%',
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.medium', '#334155')}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    outline: 'none',
    resize: 'vertical',
  },
  divider: {
    borderColor: borderLight,
    margin: `${getThemeValue('spacing.6', '24px')} 0`,
  },
  link: {
    color: primaryColor,
    textDecoration: 'none',
  },
  textCenter: {
    textAlign: 'center',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  aiChat: {
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  aiResponse: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    padding: getThemeValue('spacing.4', '16px'),
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    border: `1px solid ${getThemeValue('colors.border.medium', '#334155')}`,
    marginTop: getThemeValue('spacing.4', '16px'),
  },
  legalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.4', '16px'),
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  legalDesc: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    margin: '4px 0 0',
  },
};