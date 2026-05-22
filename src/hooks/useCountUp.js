import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, { duration = 1200, start = 0, decimals = 0, enabled = true } = {}) {
  const [value, setValue] = useState(start);
  const raf = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const t0 = performance.now();
    const delta = target - start;

    function tick(now) {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = start + delta * eased;
      setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, start, duration, decimals, enabled]);

  return value;
}
