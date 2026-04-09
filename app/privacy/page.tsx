// app/privacy/page.tsx
import { Metadata } from 'next';
import theme from '@/app/theme';

export const metadata: Metadata = {
  title: 'Privacy Policy | Yogat Fleet AI',
  description: 'Learn how Yogat Fleet AI collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  const lastUpdated = 'April 9, 2026';

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.lastUpdated}>Last updated: {lastUpdated}</p>

        <div style={styles.section}>
          <p style={styles.lead}>
            At Yogat Fleet AI, we take your privacy seriously. This policy describes how we collect, use,
            and protect information from our users, including vehicle owners, fleet managers, and drivers.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>1. Information We Collect</h2>
          <p style={styles.text}>
            We collect the following types of information to provide, improve, and secure our fleet management services:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>Account Information</strong> – name, email, phone number, company details, and role.
            </li>
            <li style={styles.listItem}>
              <strong>Vehicle Data</strong> – make, model, year, VIN, license plate, mileage, service history, and
              maintenance records.
            </li>
            <li style={styles.listItem}>
              <strong>Telematics & Location Data</strong> – if you enable GPS tracking, we collect real‑time location,
              speed, and route data to optimize fleet operations. You control this feature.
            </li>
            <li style={styles.listItem}>
              <strong>Usage Data</strong> – how you interact with our platform, including features used, time spent,
              and performance metrics.
            </li>
            <li style={styles.listItem}>
              <strong>Payment Information</strong> – when you purchase services, we collect billing details (processed
              by our secure payment partners, not stored directly).
            </li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>2. How We Use Your Information</h2>
          <p style={styles.text}>We use the information we collect to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Provide, maintain, and improve fleet management features</li>
            <li style={styles.listItem}>Personalize your experience and recommend services</li>
            <li style={styles.listItem}>Send notifications, alerts, and service reminders</li>
            <li style={styles.listItem}>Analyze usage to enhance performance and security</li>
            <li style={styles.listItem}>Comply with legal obligations and enforce our terms</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>3. Sharing of Information</h2>
          <p style={styles.text}>
            We never sell your personal data. We may share information only in the following circumstances:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>With your consent</strong> – e.g., sharing vehicle data with authorized mechanics.
            </li>
            <li style={styles.listItem}>
              <strong>Service providers</strong> – third‑party vendors who help us operate (hosting, analytics,
              payment processing) under strict confidentiality agreements.
            </li>
            <li style={styles.listItem}>
              <strong>Legal requirements</strong> – when required by law, court order, or to protect our rights.
            </li>
            <li style={styles.listItem}>
              <strong>Business transfers</strong> – in the event of a merger or acquisition.
            </li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>4. Data Security</h2>
          <p style={styles.text}>
            We implement industry‑standard security measures, including encryption, access controls, and regular
            audits. Your data is stored in secure cloud environments with multi‑factor authentication for
            administrative access. However, no method of transmission over the internet is 100% secure; we
            encourage you to protect your account credentials.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>5. Your Rights and Choices</h2>
          <p style={styles.text}>
            Depending on your location, you may have the right to:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Access, correct, or delete your personal information</li>
            <li style={styles.listItem}>Opt out of marketing communications</li>
            <li style={styles.listItem}>Disable location tracking at any time via settings</li>
            <li style={styles.listItem}>Request a copy of your data in a portable format</li>
          </ul>
          <p style={styles.text}>
            To exercise your rights, contact us at{' '}
            <a href="mailto:	
contact@yogatfleetai.com" style={styles.link}>	
contact@yogatfleetai.com</a>.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>6. Data Retention</h2>
          <p style={styles.text}>
            We retain your information as long as your account is active or as needed to provide services.
            Vehicle and fleet data may be kept for up to 7 years to comply with regulatory requirements.
            You may request deletion of your account, after which we will anonymize or delete data unless
            retention is required by law.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>7. Children’s Privacy</h2>
          <p style={styles.text}>
            Our services are not intended for individuals under 18. We do not knowingly collect personal
            information from children.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>8. International Data Transfers</h2>
          <p style={styles.text}>
            Yogat Fleet AI operates globally. Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards, such as Standard Contractual Clauses, are
            in place.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>9. Changes to This Policy</h2>
          <p style={styles.text}>
            We may update this policy periodically. We will notify you of significant changes via email or
            through a prominent notice on our platform. The “Last updated” date at the top reflects the latest
            revision.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>10. Contact Us</h2>
          <p style={styles.text}>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Email: <a href="mailto:	
contact@yogatfleetai.com" style={styles.link}>	
contact@yogatfleetai.com</a></li>
            <li style={styles.listItem}>Address: Yogat Fleet AI, Water slacks Walk, Sheffield S13 7DP</li>
          </ul>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            By using Yogat Fleet AI, you acknowledge that you have read and understand this Privacy Policy.
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
  lead: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    lineHeight: '1.6',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  heading: {
    fontSize: getThemeValue('fontSizes.xl', '20px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  text: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    lineHeight: '1.6',
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
    lineHeight: '1.6',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.1', '4px'),
  },
  link: {
    color: getThemeValue('colors.primary', '#22c55e'),
    textDecoration: 'none',
    transition: 'color 0.2s',
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

// Helper to safely access theme values (fallback if theme is incomplete)
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