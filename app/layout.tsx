// app/layout.tsx
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import ParticlesBackground from '@/components/ParticlesBackground';
import { BasketProvider } from '@/lib/contexts/BasketContext';
import NotificationBellWrapper from '@/components/NotificationBellWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yogat Fleet AI',
  description: 'Fleet management and garage marketplace platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          position: 'relative',
          overflowX: 'hidden',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        suppressHydrationWarning
      >
        <ParticlesBackground />

        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.5rem',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <NotificationBellWrapper />
        </div>

        <BasketProvider>
          <AppShell>
            <main
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
              }}
              className="page-fade-in"
            >
              {children}
            </main>
          </AppShell>
        </BasketProvider>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}