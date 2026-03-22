'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

type Tab = 'profile' | 'notifications' | 'security' | 'support' | 'legal';

const primaryColor = '#22c55e';

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

  useEffect(() => {
    fetchUser();
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'support', label: 'Support' },
    { id: 'legal', label: 'Legal' },
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
                color: activeTab === tab.id ? primaryColor : '#94a3b8',
              }}
            >
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

          {activeTab === 'notifications' && (
            <div>
              <p style={styles.sectionDesc}>Manage your notification preferences.</p>
              <div style={styles.option}>
                <label>Email Notifications</label>
                <input type="checkbox" defaultChecked />
              </div>
              <div style={styles.option}>
                <label>Push Notifications</label>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <div style={styles.securityItem}>
                <div>
                  <h3>Password</h3>
                  <p>Change your password</p>
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
                  <h3>Two-Factor Authentication</h3>
                  <p>Add an extra layer of security to your account</p>
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
                  <h3>Sign out</h3>
                  <p>Log out of your account</p>
                </div>
                <button onClick={handleLogout} style={styles.dangerButton}>
                  Sign Out
                </button>
              </div>
            </div>
          )}

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
              <p>
                <Link href="/contact" style={styles.link}>Contact human support</Link> or visit our{' '}
                <Link href="/help" style={styles.link}>Help Center</Link>.
              </p>
            </div>
          )}

          {activeTab === 'legal' && (
            <div>
              <h3 style={styles.subtitle}>Legal</h3>
              <p>
                <Link href="/terms" style={styles.link}>Terms of Service</Link>
              </p>
              <p>
                <Link href="/privacy" style={styles.link}>Privacy Policy</Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#020617',
    padding: '40px 20px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  container: {
    maxWidth: 800,
    margin: '0 auto',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 32,
  },
  tabs: {
    display: 'flex',
    gap: 24,
    borderBottom: '1px solid #1e293b',
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '8px 0',
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  content: {
    background: '#0f172a',
    borderRadius: 16,
    border: '1px solid #1e293b',
    padding: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: 16,
    outline: 'none',
  },
  inputDisabled: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#94a3b8',
    fontSize: 16,
    cursor: 'not-allowed',
  },
  small: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  button: {
    background: primaryColor,
    color: '#020617',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    width: 'fit-content',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#f1f5f9',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dangerButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#ef4444',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  message: {
    padding: '12px',
    borderRadius: 8,
    fontSize: 14,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  securityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #1e293b',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  sectionDesc: {
    color: '#94a3b8',
    marginBottom: 24,
  },
  textarea: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '12px',
    color: '#f1f5f9',
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
  },
  divider: {
    borderColor: '#1e293b',
    margin: '24px 0',
  },
  link: {
    color: primaryColor,
    textDecoration: 'none',
  },
  aiChat: {
    marginBottom: 24,
  },
  aiResponse: {
    background: '#1e293b',
    padding: 16,
    borderRadius: 8,
    border: '1px solid #334155',
    marginTop: 16,
  },
};