// components/ui/SkeletonCard.tsx
import theme from '@/app/theme';

export function SkeletonCard() {
  return (
    <div style={styles.card}>
      <div style={styles.imageSkeleton} />
      <div style={styles.textSkeleton} />
      <div style={styles.textSkeletonShort} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: theme.colors.background.card,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
  },
  imageSkeleton: {
    height: '140px',
    background: theme.colors.border.medium,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  textSkeleton: {
    height: '16px',
    background: theme.colors.border.medium,
    margin: '12px 12px 8px 12px',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  textSkeletonShort: {
    height: '12px',
    background: theme.colors.border.medium,
    margin: '0 12px 12px 12px',
    borderRadius: '4px',
    width: '60%',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};