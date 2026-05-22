import { useRef, useCallback } from 'react';

export function use3DTilt({ max = 12, scale = 1.02, speed = 400 } = {}) {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const rotX = -dy * max;
    const rotY = dx * max;
    el.style.transition = `transform ${speed}ms cubic-bezier(0.03,0.98,0.52,0.99)`;
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scale},${scale},${scale})`;
  }, [max, scale, speed]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = `transform ${speed}ms cubic-bezier(0.16,1,0.3,1)`;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, [speed]);

  return { ref, onMouseMove, onMouseLeave };
}
