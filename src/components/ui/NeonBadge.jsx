import { cn } from '../../lib/utils';

const VARIANTS = {
  cyber:  'neon-badge-cyber',
  cyan:   'neon-badge-cyan',
  gold:   'neon-badge-gold',
  red:    'neon-badge-red',
  green:  'neon-badge-green',
  mint:   'cp-badge-mint',
  indigo: 'cp-badge-indigo',
};

export function NeonBadge({ children, variant = 'cyber', dot = false, className = '' }) {
  return (
    <span className={cn('neon-badge', VARIANTS[variant] ?? VARIANTS.cyber, className)}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}
