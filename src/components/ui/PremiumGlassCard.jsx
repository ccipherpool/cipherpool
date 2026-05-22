import { use3DTilt } from '../../hooks/use3DTilt';
import { cn } from '../../lib/utils';

const VARIANTS = {
  cyber: 'luxury-card',
  cyan:  'luxury-card luxury-card-cyan',
  gold:  'luxury-card luxury-card-gold',
  plain: 'cp-card-glass',
};

export function PremiumGlassCard({
  children,
  variant = 'cyber',
  tilt = true,
  className = '',
  style,
  onClick,
  ...props
}) {
  const { ref, onMouseMove, onMouseLeave } = use3DTilt({ max: 8, scale: 1.015 });

  return (
    <div
      ref={tilt ? ref : undefined}
      onMouseMove={tilt ? onMouseMove : undefined}
      onMouseLeave={tilt ? onMouseLeave : undefined}
      onClick={onClick}
      className={cn(VARIANTS[variant] ?? VARIANTS.cyber, className)}
      style={{ transformStyle: 'preserve-3d', ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
