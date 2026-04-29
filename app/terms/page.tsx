// app/terms/page.tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import theme from '@/app/theme';

export default function TermsPage() {
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

        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.lastUpdated}>Last updated: April 28, 2026</p>

        <div style={styles.content}>
          <section style={styles.section}>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Yogat Fleet AI ("we", "our", "us"), you agree to be bound by these Terms of Service.
              If you do not agree, please do not use our platform.
            </p>
          </section>

          <section style={styles.section}>
            <h2>2. Description of Service</h2>
            <p>
              Yogat Fleet AI provides fleet management tools, a marketplace for vehicle repairs, affiliate links to
              car parts, and diagnostic insights. We may modify or discontinue any part of the service at any time.
            </p>
          </section>

          <section style={styles.section}>
            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials. You agree to accept
              responsibility for all activities that occur under your account. You must be at least 18 years old to
              use our services.
            </p>
          </section>

          <section style={styles.section}>
            <h2>4. Affiliate Links & Third‑Party Transactions</h2>
            <p>
              Our marketplace contains affiliate links (eBay, Channel3, etc.). We earn commissions on qualifying
              purchases, but we are not responsible for the products, services, or content of third‑party sites.
              Transactions are solely between you and the third‑party merchant.
            </p>
          </section>

          <section style={styles.section}>
            <h2>5. User Conduct</h2>
            <p>
              You agree not to misuse our services, including but not limited to: violating any laws, uploading
              malicious code, scraping data, or interfering with other users’ access. We reserve the right to
              terminate accounts that violate these terms.
            </p>
          </section>

          <section style={styles.section}>
            <h2>6. Intellectual Property</h2>
            <p>
              All content, logos, and software on Yogat Fleet AI are our property or licensed to us. You may not
              copy, modify, or distribute any part of the platform without written permission.
            </p>
          </section>

          <section style={styles.section}>
            <h2>7. Disclaimers & Limitation of Liability</h2>
            <p>
              Our services are provided "as is" without warranties of any kind. We are not liable for any indirect,
              incidental, or consequential damages arising from your use of the platform. Your sole remedy is to
              stop using the service.
            </p>
          </section>

          <section style={styles.section}>
            <h2>8. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes constitutes acceptance of the
              new terms.
            </p>
          </section>

          <section style={styles.section}>
            <h2>9. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the United Kingdom, without regard to its conflict of law
              provisions.
            </p>
          </section>

          <section style={styles.section}>
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions, please contact us at: <strong>support@yogatfleetai.com</strong>
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
  // These will be used by the component styles, but define them to avoid errors
};

// Add missing styles inline
styles.section = {
  ...styles.section,
  backgroundColor: 'rgba(2, 6, 23, 0.4)',
  borderRadius: '20px',
  padding: '20px',
  border: `1px solid rgba(255,255,255,0.05)`,
};