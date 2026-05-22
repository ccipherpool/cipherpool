import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const GlowInput = forwardRef(function GlowInput(
  { label, error, hint, icon, iconRight, className = '', wrapperClass = '', ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClass)}>
      {label && (
        <label className="text-[10px] font-bold tracking-widest uppercase text-white/40">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'glow-input',
            icon ? 'pl-11' : '',
            iconRight ? 'pr-11' : '',
            error ? 'border-red-500/40 focus:border-red-500/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : '',
            className
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {hint && !error && <p className="text-[11px] text-white/30">{hint}</p>}
    </div>
  );
});
