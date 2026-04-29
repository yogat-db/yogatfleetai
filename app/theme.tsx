// app/theme.ts
/**
 * UPGRADED THEME SYSTEM
 * - Added breakpoints for responsive design
 * - Added zIndex scale (modals, sidebar, topbar)
 * - Added transition durations
 * - Added typography presets (headings, body)
 * - Added numeric spacing array for consistent padding/margin
 * - All previous values preserved
 */

const colors = {
  primary: '#22c55e',
  primaryLight: '#4ade80',
  primaryDark: '#16a34a',
  
  background: {
    main: '#020617',    // Slate 950
    card: '#0f172a',    // Slate 900
    subtle: '#1e293b',  // Slate 800
    overlay: 'rgba(2, 6, 23, 0.8)',
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

// Responsive breakpoints (mobile-first)
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Z-index scale
const zIndex = {
  negative: -1,
  base: 0,
  low: 10,
  medium: 20,
  high: 30,
  modal: 100,
  drawer: 200,
  overlay: 150,
  toast: 300,
  topbar: 50,
} as const;

// Transition defaults
const transition = {
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  easing: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Spacing array (0-16) for responsive padding/margin
const spacingArray = [
  0,    // 0
  4,    // 1 -> 4px
  8,    // 2 -> 8px
  12,   // 3 -> 12px
  16,   // 4 -> 16px
  20,   // 5 -> 20px
  24,   // 6 -> 24px
  32,   // 7 -> 32px
  40,   // 8 -> 40px
  48,   // 9 -> 48px
  64,   // 10 -> 64px
  80,   // 11 -> 80px
  96,   // 12 -> 96px
  128,  // 13 -> 128px
  160,  // 14 -> 160px
  192,  // 15 -> 192px
  256,  // 16 -> 256px
] as const;

// Spacing object (same values, keyed by string)
const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '32px',
  8: '40px',
  9: '48px',
  10: '64px',
  11: '80px',
  12: '96px',
  13: '128px',
  14: '160px',
  15: '192px',
  16: '256px',
} as const;

// Typography presets
const typography = {
  h1: {
    fontSize: '2.5rem',
    fontWeight: 800,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.25,
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  body: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  small: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
} as const;

// Media query helpers (string)
const media = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
} as const;

export const theme = {
  colors,
  breakpoints,
  zIndex,
  transition,
  spacing,
  spacingArray,
  typography,
  media,

  // Modern UI Effects
  gradients: {
    background: `linear-gradient(180deg, ${colors.background.main} 0%, ${colors.background.card} 100%)`,
    title: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
    primary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
  },

  // Glassmorphism Utility
  glass: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
  },

  // Numeric font sizes (can be used with `px`)
  fontSizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },

  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  fontFamilies: {
    sans: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-jetbrains), monospace',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glow: `0 0 20px ${colors.primary}33`,
  },
} as const;

export type Theme = typeof theme;
export default theme;