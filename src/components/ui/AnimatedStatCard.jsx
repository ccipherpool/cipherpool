import { useCountUp } from '../../hooks/useCountUp';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { cn } from '../../lib/utils';

function formatValue(value, format) {
  if (format === 'currency') return value.toLocaleString();
  if (format === 'percent') return `${value}%`;
  if (format === 'compact') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  }
  return value.toLocaleString();
}

const ACCENT_CLASSES = {
  cyber: { border: 'rgba(139,92,246,0.15)', icon: 'bg-cyber-dim text-cyber-400', bar: 'health-excellent' },
  cyan:  { border: 'rgba(6,182,212,0.15)',  icon: 'bg-cyan-dim  text-neon-cyan', bar: 'health-good' },
  gold:  { border: 'rgba(245,158,11,0.15)', icon: 'bg-gold-dim  text-cyber-gold', bar: 'health-warning' },
  mint:  { border: 'rgba(16,185,129,0.15)', icon: 'bg-mint-glow/20 text-mint', bar: 'health-good' },
  red:   { border: 'rgba(239,68,68,0.15)',  icon: 'bg-red-500/10 text-cp-red', bar: 'health-critical' },
};

export function AnimatedStatCard({
  label,
  value = 0,
  previousValue,
  icon,
  accent = 'cyber',
  format = 'compact',
  suffix = '',
  prefix = '',
  description,
  className = '',
}) {
  const { ref, visible } = useScrollReveal();
  const animated = useCountUp(value, { duration: 1400, enabled: visible });
  const ac = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.cyber;

  const change = previousValue != null ? value - previousValue : null;
  const changePct = change != null && previousValue > 0
    ? ((change / previousValue) * 100).toFixed(1)
    : null;

  return (
    <div
      ref={ref}
      className={cn('stat-card', visible ? 'animate-slide-up' : 'opacity-0', className)}
    >
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg', ac.icon)}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1">{label}</p>
          <p className="stat-card-value text-white">
            {prefix}{formatValue(animated, format)}{suffix}
          </p>
          {description && (
            <p className="text-[11px] text-white/35 mt-1 leading-tight">{description}</p>
          )}
        </div>
        {changePct != null && (
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
            change >= 0
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          )}>
            {change >= 0 ? '+' : ''}{changePct}%
          </span>
        )}
      </div>
    </div>
  );
}
