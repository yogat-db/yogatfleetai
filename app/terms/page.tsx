// app/terms/page.tsx
import { Metadata } from 'next';
import theme from '@/app/theme';

export const metadata: Metadata = {
  title: 'Terms of Service | Yogat Fleet AI',
  description: 'Terms and conditions for using Yogat Fleet AI platform.',
};

export default function TermsPage() {
  const lastUpdated = 'April 9, 2026';

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.lastUpdated}>Last updated: {lastUpdated}</p>

        <div style={styles.section}>
          <h2 style={styles.heading}>1. Acceptance of Terms</h2>
          <p style={styles.text}>
            By accessing or using Yogat Fleet AI (“we”, “us”, “our”), you agree to be bound by these Terms of Service
            and our Privacy Policy. If you do not agree, please do not use our platform.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>2. Description of Service</h2>
          <p style={styles.text}>
            Yogat Fleet AI provides a fleet management platform that allows vehicle owners, fleet managers, and
            mechanics to manage vehicles, schedule maintenance, post repair jobs, receive AI‑powered diagnostics,
            and communicate. All services are provided “as is” and we reserve the right to modify or discontinue
            features at any time.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>3. User Accounts</h2>
          <p style={styles.text}>
            You are responsible for maintaining the confidentiality of your login credentials and for all activities
            that occur under your account. You agree to provide accurate, current, and complete information during
            registration and to update it as needed.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>4. Acceptable Use</h2>
          <p style={styles.text}>You agree not to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Use the service for any illegal purpose or in violation of any laws.</li>
            <li style={styles.listItem}>Interfere with or disrupt the integrity or performance of the platform.</li>
            <li style={styles.listItem}>Attempt to gain unauthorised access to any user accounts or data.</li>
            <li style={styles.listItem}>Post false, misleading, or malicious content.</li>
            <li style={styles.listItem}>Use automated scripts or bots to interact with the platform.</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>5. Payments and Subscriptions</h2>
          <p style={styles.text}>
            Some features may require payment (e.g., mechanic subscriptions, premium diagnostics). All payments are
            processed by Stripe. You agree to pay all fees associated with your chosen plan. Fees are non‑refundable
            unless required by law. We may change pricing with 30 days’ notice.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>6. Cancellation and Termination</h2>
          <p style={styles.text}>
            You may cancel your account at any time via the settings page. We may suspend or terminate your account
            if you violate these terms. Upon termination, your access to the platform will cease, and we may delete
            your data in accordance with our Privacy Policy.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>7. Intellectual Property</h2>
          <p style={styles.text}>
            All content, features, and functionality of the platform (including but not limited to software,
            algorithms, logos, and design) are owned by Yogat Fleet AI or its licensors. You may not copy, modify,
            or reverse‑engineer any part of the service without our prior written consent.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>8. Disclaimer of Warranties</h2>
          <p style={styles.text}>
            The platform is provided “as is” and “as available” without warranties of any kind, either express or
            implied. We do not guarantee that the service will be uninterrupted, error‑free, or secure. AI‑generated
            insights are for informational purposes only; always consult a qualified mechanic.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>9. Limitation of Liability</h2>
          <p style={styles.text}>
            To the maximum extent permitted by law, Yogat Fleet AI shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising out of or related to your use of the platform.
            Our total liability shall not exceed the amount you paid us in the preceding 12 months.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>10. Governing Law</h2>
          <p style={styles.text}>
            These terms shall be governed by and construed in accordance with the laws of England and Wales,
            without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of London.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>11. Changes to Terms</h2>
          <p style={styles.text}>
            We may update these terms from time to time. We will notify you of material changes via email or a
            prominent notice on the platform. Your continued use after the effective date constitutes acceptance
            of the revised terms.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>12. Contact Us</h2>
          <p style={styles.text}>
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@yogat.com" style={styles.link}>legal@yogat.com</a>.
          </p>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            By using Yogat Fleet AI, you acknowledge that you have read, understood, and agree to be bound by these
            Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    padding: getThemeValue('spacing.10', '40px'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    background: getThemeValue('colors.background.card', '#0f172a'),
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    padding: getThemeValue('spacing.8', '32px'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  lastUpdated: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  section: {
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  heading: {
    fontSize: getThemeValue('fontSizes.xl', '20px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  text: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    lineHeight: 1.6,
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.3', '12px'),
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.3', '12px'),
  },
  listItem: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    lineHeight: 1.6,
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.1', '4px'),
  },
  link: {
    color: getThemeValue('colors.primary', '#22c55e'),
    textDecoration: 'none',
  },
  footer: {
    marginTop: getThemeValue('spacing.8', '32px'),
    paddingTop: getThemeValue('spacing.4', '16px'),
    borderTop: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  footerText: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    textAlign: 'center',
  },
};

// Helper to safely access theme values
function getThemeValue(path: string, fallback: any): any {
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