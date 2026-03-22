// components/ParticlesBackground.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';
import theme from '@/app/theme';

export default function ParticlesBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  // Optional: track when particles are loaded (e.g., for logging)
  const particlesLoaded = useCallback(async () => {
    console.log('Particles loaded');
  }, []);

  const options = {
    particles: {
      number: {
        value: isMobile ? 50 : 80,
        density: {
          enable: true,
          area: isMobile ? 1200 : 800,
        },
      },
      color: {
        value: theme.colors.primary, // uses your theme's green
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: 0.3,
        random: true,
        anim: {
          enable: true,
          speed: 1,
          opacity_min: 0.1,
          sync: false,
        },
      },
      size: {
        value: { min: 1, max: 3 },
        random: true,
        anim: {
          enable: true,
          speed: 2,
          size_min: 0.5,
          sync: false,
        },
      },
      move: {
        enable: true,
        speed: 0.8,
        direction: 'none',
        random: true,
        straight: false,
        outModes: 'out',
      },
    },
    detectRetina: true,
    fpsLimit: 60,
  };

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
    >
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={options}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Ensures particles don't block UI interactions
        }}
      />
    </div>
  );
}
