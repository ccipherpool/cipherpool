import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const VARIANTS = {
  primary: 'cyber-btn-primary',
  cyan:    'cyber-btn-cyan',
  gold:    'cyber-btn-gold',
  ghost:   'cyber-btn-ghost',
  outline: 'cyber-btn-outline',
  danger:  'cp-btn-danger',
  mint:    'cp-btn-primary',
  indigo:  'cp-btn-indigo',
};

const SIZES = {
  sm: 'cyber-btn-sm',
  md: '',
  lg: 'cyber-btn-lg',
};

export const CyberButton = forwardRef(function CyberButton(
  { children, variant = 'primary', size = 'md', className = '', loading = false, icon, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn('cyber-btn', VARIANTS[variant], SIZES[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
});
