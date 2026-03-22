// app/privacy/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Yogat Fleet',
  description: 'Learn how Yogat Fleet collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  const lastUpdated = 'March 20, 2026';

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-indigo prose-lg text-gray-600 space-y-6">
          <p className="lead">
            At Yogat Fleet, we take your privacy seriously. This policy describes how we collect, use,
            and protect information from our users, including vehicle owners, fleet managers, and drivers.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect the following types of information to provide, improve, and secure our fleet management services:
          </p>
          <ul>
            <li>
              <strong>Account Information</strong> – name, email, phone number, company details, and role.
            </li>
            <li>
              <strong>Vehicle Data</strong> – make, model, year, VIN, license plate, mileage, service history, and
              maintenance records.
            </li>
            <li>
              <strong>Telematics & Location Data</strong> – if you enable GPS tracking, we collect real‑time location,
              speed, and route data to optimize fleet operations. You control this feature.
            </li>
            <li>
              <strong>Usage Data</strong> – how you interact with our platform, including features used, time spent,
              and performance metrics.
            </li>
            <li>
              <strong>Payment Information</strong> – when you purchase services, we collect billing details (processed
              by our secure payment partners, not stored directly).
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve fleet management features</li>
            <li>Personalize your experience and recommend services</li>
            <li>Send notifications, alerts, and service reminders</li>
            <li>Analyze usage to enhance performance and security</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>

          <h2>3. Sharing of Information</h2>
          <p>
            We never sell your personal data. We may share information only in the following circumstances:
          </p>
          <ul>
            <li>
              <strong>With your consent</strong> – e.g., sharing vehicle data with authorized mechanics.
            </li>
            <li>
              <strong>Service providers</strong> – third‑party vendors who help us operate (hosting, analytics,
              payment processing) under strict confidentiality agreements.
            </li>
            <li>
              <strong>Legal requirements</strong> – when required by law, court order, or to protect our rights.
            </li>
            <li>
              <strong>Business transfers</strong> – in the event of a merger or acquisition.
            </li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement industry‑standard security measures, including encryption, access controls, and regular
            audits. Your data is stored in secure cloud environments with multi‑factor authentication for
            administrative access. However, no method of transmission over the internet is 100% secure; we
            encourage you to protect your account credentials.
          </p>

          <h2>5. Your Rights and Choices</h2>
          <p>
            Depending on your location, you may have the right to:
          </p>
          <ul>
            <li>Access, correct, or delete your personal information</li>
            <li>Opt out of marketing communications</li>
            <li>Disable location tracking at any time via settings</li>
            <li>Request a copy of your data in a portable format</li>
          </ul>
          <p>
            To exercise your rights, contact us at <a href="mailto:privacy@yogat.com" className="text-indigo-600">privacy@yogat.com</a>.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your information as long as your account is active or as needed to provide services.
            Vehicle and fleet data may be kept for up to 7 years to comply with regulatory requirements.
            You may request deletion of your account, after which we will anonymize or delete data unless
            retention is required by law.
          </p>

          <h2>7. Children’s Privacy</h2>
          <p>
            Our services are not intended for individuals under 18. We do not knowingly collect personal
            information from children.
          </p>

          <h2>8. International Data Transfers</h2>
          <p>
            Yogat Fleet operates globally. Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards, such as Standard Contractual Clauses, are
            in place.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify you of significant changes via email or
            through a prominent notice on our platform. The “Last updated” date at the top reflects the latest
            revision.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul>
            <li>Email: <a href="mailto:privacy@yogat.com" className="text-indigo-600">privacy@yogat.com</a></li>
            <li>Address: Yogat Fleet, 123 Tech Lane, San Francisco, CA 94105</li>
          </ul>

          <div className="border-t border-gray-200 mt-8 pt-6 text-sm text-gray-500">
            <p>
              By using Yogat Fleet, you acknowledge that you have read and understand this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
