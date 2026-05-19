'use client';

import { usePathname } from 'next/navigation';
import AppShell from '@/components/AppShell';

function Background() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 30% 40%, #1e293b 0%, #020617 80%)',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname?.startsWith('/auth') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/';

  return (
    <>
      <Background />
      {isAuthPage ? children : <AppShell>{children}</AppShell>}
    </>
  );
}