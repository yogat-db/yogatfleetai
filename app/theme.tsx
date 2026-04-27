/**
 * UPGRADED THEME SYSTEM
 * - Fixed: Added missing background gradient for Particles
 * - Added: Referential values (Gradients now sync with Colors)
 * - Added: Glassmorphism & Overlay utilities
 */

const colors = {
  primary: '#22c55e',
  primaryLight: '#4ade80',
  primaryDark: '#16a34a',
  
  background: {
    main: '#020617',  // Slate 950
    card: '#0f172a',  // Slate 900
    subtle: '#1e293b', // Slate 800
    overlay: 'rgba(2, 6, 23, 0.8)', // For modals
  },

  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#020617',
  },

  border: {
    light: '#1e293b',
    medium: '#334155',
    focus: '#3b82f6',
  },

  status: {
    healthy: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    info: '#3b82f6',
  },
} as const;

export const theme = {
  colors,

  // Modern UI Effects (Fixed & Expanded)
  gradients: {
    // FIX: ParticlesBackground now has its source
    background: `linear-gradient(180deg, ${colors.background.main} 0%, ${colors.background.card} 100%)`,
    title: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
    primary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
  },

  // Glassmorphism Utility (New)
  glass: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
  },

  spacing: {
    0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 
    6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
  },

  fontSizes: {
    xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px',
    '2xl': '24px', '3xl': '30px', '4xl': '36px', '5xl': '48px',
  },

  fontWeights: {
    normal: '400', medium: '500', semibold: '600', bold: '700',
    extrabold: '800', black: '900',
  },

  borderRadius: {
    none: '0', sm: '4px', md: '8px', lg: '12px', xl: '16px',
    '2xl': '24px', full: '9999px',
  },

  fontFamilies: {
    sans: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-jetbrains), monospace',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glow: `0 0 20px ${colors.primary}33`, // Dynamic 20% opacity glow
  }
} as const;

export type Theme = typeof theme;
export default theme;
