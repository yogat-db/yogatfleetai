import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import ParticlesBackground from '@/components/ParticlesBackground';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Yogat Fleet AI',
  description: 'Fleet management and garage marketplace platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ParticlesBackground />
        <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}