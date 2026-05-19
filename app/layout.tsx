import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import ParticlesBackground from '@/components/ParticlesBackground';
import { BasketProvider } from '@/lib/contexts/BasketContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://yogatfleetai.com'),
  title: {
    default: 'Yogat Fleet AI',
    template: '%s | Yogat Fleet AI',
  },
  description: 'Fleet management and garage marketplace platform',
  applicationName: 'Yogat Fleet AI',
  keywords: [
    'fleet management',
    'garage marketplace',
    'vehicle diagnostics',
    'service history',
    'mechanic marketplace',
    'fleet platform',
  ],
  authors: [{ name: 'Yogat Fleet AI' }],
  creator: 'Yogat Fleet AI',
  publisher: 'Yogat Fleet AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Yogat Fleet AI',
    description: 'Fleet management and garage marketplace platform',
    siteName: 'Yogat Fleet AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yogat Fleet AI',
    description: 'Fleet management and garage marketplace platform',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
    >
      <body
        suppressHydrationWarning
        className="page-fade-in"
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          position: 'relative',
          overflowX: 'hidden',
          fontFamily:
            'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#020617',
          color: '#f8fafc',
        }}
      >
        <ParticlesBackground />

        <BasketProvider>
          <AppShell>
            <main
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                minHeight: 'calc(100vh - 56px)',
                padding: '16px',
              }}
            >
              {children}
            </main>
          </AppShell>
        </BasketProvider>

        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{
            top: 16,
            right: 16,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.92)',
              color: '#f8fafc',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '14px',
              boxShadow: '0 16px 40px rgba(2, 6, 23, 0.35)',
              padding: '12px 14px',
              fontSize: '14px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#04130a',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            ariaProps: {
              role: 'status',
              'aria-live': 'polite',
            },
          }}
        />
      </body>
    </html>
  );
}