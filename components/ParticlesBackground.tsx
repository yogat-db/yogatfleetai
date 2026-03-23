'use client';

import theme from '@/app/theme';

export default function ParticlesBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.gradients.background,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
