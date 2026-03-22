// app/theme.ts

export const colors = {
  // Primary brand color
  primary: '#22c55e',    // green
  primaryDark: '#15803d',
  primaryLight: '#4ade80',

  // Accents
  secondary: '#3b82f6',  // blue
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#60a5fa',

  // Backgrounds
  background: {
    main: '#020617',     // darkest
    card: '#0f172a',     // slate-900
    elevated: '#1e293b', // slate-800
    muted: '#0f172a',
  },

  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
    disabled: '#475569',
  },

  // Borders
  border: {
    light: '#1e293b',
    medium: '#334155',
    dark: '#0f172a',
  },

  // Status
  status: {
    healthy: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
  },
}

export const gradients = {
  // Gradient for main titles
  title: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
  // Gradient for cards (subtle)
  card: 'linear-gradient(145deg, #0f172a 0%, #0f172a 100%)',
  // Background gradient (used in auth pages)
  background: 'radial-gradient(circle at 30% 40%, #1e293b 0%, #020617 80%)',
}

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: '0 0 15px rgba(34, 197, 94, 0.3)',
}

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
}

export const fontFamilies = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
}

export const fontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
}

export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
}

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
}

export const transitions = {
  default: 'all 0.2s ease',
  slow: 'all 0.3s ease',
  fast: 'all 0.1s ease',
}

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Helper to generate a CSS object for a card
export const cardStyles = {
  background: colors.background.card,
  border: `1px solid ${colors.border.light}`,
  borderRadius: borderRadius.xl,
  padding: spacing[6],
  transition: transitions.default,
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: shadows.lg,
  },
}

// Helper to generate a CSS object for a button
export const buttonStyles = {
  primary: {
    background: colors.primary,
    color: '#020617',
    border: 'none',
    borderRadius: borderRadius.lg,
    padding: `${spacing[2]} ${spacing[4]}`,
    fontWeight: fontWeights.semibold,
    cursor: 'pointer',
    transition: transitions.default,
    ':hover': {
      background: colors.primaryDark,
      transform: 'scale(1.02)',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  secondary: {
    background: 'transparent',
    color: colors.text.secondary,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.lg,
    padding: `${spacing[2]} ${spacing[4]}`,
    fontWeight: fontWeights.medium,
    cursor: 'pointer',
    transition: transitions.default,
    ':hover': {
      background: colors.background.elevated,
      color: colors.text.primary,
    },
  },
}

// Default export for easy import
export default {
  colors,
  gradients,
  shadows,
  spacing,
  fontFamilies,
  fontSizes,
  fontWeights,
  borderRadius,
  transitions,
  breakpoints,
  cardStyles,
  buttonStyles,
}