// app/privacy/page.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import theme from '@/app/theme';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={styles.page}
    >
      <div style={styles.glassCard}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} /> Back
        </button>

        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>Y</div>
          <span style={styles.logoText}>Yogat Fleet AI</span>
        </div>

        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.lastUpdated}>Last updated: April 28, 2026</p>

        <div style={styles.content}>
          <section style={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly, such as when you create an account (name, email, phone),
              add vehicles, post jobs, or use our marketplace. We also collect usage data (IP address, browser type,
              pages visited) through cookies and similar technologies.
            </p>
          </section>

          <section style={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>
              We use your data to provide and improve our services, personalise your experience, process affiliate
              transactions, communicate with you (including security and service updates), and comply with legal
              obligations. We do not sell your personal data to third parties.
            </p>
          </section>

          <section style={styles.section}>
            <h2>3. Affiliate Partnerships</h2>
            <p>
              Our platform contains affiliate links (e.g., eBay, Channel3). When you click these links, the merchant
              may receive information about your visit (e.g., referral source, but not your identity). These
              merchants’ privacy policies apply to any data they collect.
            </p>
          </section>

          <section style={styles.section}>
            <h2>4. Data Retention & Security</h2>
            <p>
              We retain your personal data as long as your account is active or as needed to provide services.
              We implement reasonable security measures (encryption, access controls) but cannot guarantee absolute
              security.
            </p>
          </section>

          <section style={styles.section}>
            <h2>5. Your Rights</h2>
            <p>
              You may access, correct, or delete your personal information by contacting us. You may also opt out
              of marketing communications. UK residents have additional rights under the Data Protection Act 2018.
            </p>
          </section>

          <section style={styles.section}>
            <h2>6. Cookies & Tracking</h2>
            <p>
              We use necessary cookies for authentication and optional analytics cookies (e.g., Google Analytics).
              You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section style={styles.section}>
            <h2>7. Children’s Privacy</h2>
            <p>
              Our services are not directed to children under 16. We do not knowingly collect personal information
              from children. If we become aware of such data, we will delete it.
            </p>
          </section>

          <section style={styles.section}>
            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be notified via email or
              a notice on our website.
            </p>
          </section>

          <section style={styles.section}>
            <h2>9. Contact Information</h2>
            <p>
              For any privacy‑related questions, please email <strong>privacy@yogatfleetai.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

const getThemeValue = (path: string, fallback: any) => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else return fallback;
  }
  return current;
};

const primaryColor = getThemeValue('colors.primary', '#22c55e');
const bgMain = getThemeValue('colors.background.main', '#020617');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textMuted = getThemeValue('colors.text.muted', '#64748b');

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: bgMain,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  glassCard: {
    maxWidth: '900px',
    width: '100%',
    background: `rgba(15, 23, 42, 0.8)`,
    backdropFilter: 'blur(12px)',
    borderRadius: '32px',
    border: `1px solid rgba(255,255,255,0.08)`,
    padding: '40px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: `1px solid ${borderMedium}`,
    borderRadius: '12px',
    padding: '8px 16px',
    color: textSecondary,
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '24px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '24px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: primaryColor,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 800,
    color: bgMain,
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: textPrimary,
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '4px',
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #f8fafc, #94a3b8)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
  lastUpdated: {
    textAlign: 'center',
    color: textMuted,
    fontSize: '13px',
    marginBottom: '40px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderRadius: '20px',
    padding: '20px',
    border: `1px solid rgba(255,255,255,0.05)`,
  },
};