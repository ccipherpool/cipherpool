import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export function MovingBorder({
  children,
  className,
  outerClassName,
  borderWidth = 1,
  radius = 15,
  gradientWidth,
  duration = 3,
  colors = ["#06b6d4"],
  isCircle = false,
}) {
  const scope = useRef(null);
  const effectiveRadius = isCircle ? 9999 : radius;

  useGSAP(() => {
    const root = scope.current;
    if (!root) return;

    const movingGradient = root.querySelector(".cp-moving-gradient");
    if (!movingGradient) return;

    let pathTl = null;
    let colorTl = null;

    const updateAnimation = () => {
      if (pathTl) pathTl.kill();

      const rect = root.getBoundingClientRect();
      const width = rect.width - borderWidth * 2;
      const height = rect.height - borderWidth * 2;
      let path;

      if (isCircle) {
        const centerX = width / 2;
        const centerY = height / 2;
        const circleRadius = Math.min(width, height) / 2;
        const numPoints = 64;
        path = Array.from({ length: numPoints }, (_, i) => {
          const angle = (i / numPoints) * Math.PI * 2;
          return {
            x: centerX + circleRadius * Math.cos(angle),
            y: centerY + circleRadius * Math.sin(angle),
          };
        });
      } else {
        path = [
          { x: effectiveRadius, y: 0 },
          { x: width - effectiveRadius, y: 0 },
          { x: width, y: effectiveRadius },
          { x: width, y: height - effectiveRadius },
          { x: width - effectiveRadius, y: height },
          { x: effectiveRadius, y: height },
          { x: 0, y: height - effectiveRadius },
          { x: 0, y: effectiveRadius },
          { x: effectiveRadius, y: 0 },
        ];
      }

      pathTl = gsap.timeline({ repeat: -1, defaults: { ease: "none", duration } });
      pathTl.to(movingGradient, {
        motionPath: { path, fromCurrent: false, curviness: isCircle ? 1 : 1.5 },
      });
    };

    const setupColorAnimation = () => {
      if (colors.length <= 1) {
        root.style.setProperty("--cp-border-color", colors[0]);
        return;
      }
      root.style.setProperty("--cp-border-color", colors[0]);
      colorTl = gsap.timeline({ repeat: -1, defaults: { ease: "none", duration: duration / colors.length } });
      colors.forEach((_, index) => {
        const nextColor = colors[(index + 1) % colors.length];
        colorTl.to(root, { "--cp-border-color": nextColor });
      });
    };

    updateAnimation();
    setupColorAnimation();

    const resizeObserver = new ResizeObserver(() => updateAnimation());
    resizeObserver.observe(root);

    return () => {
      if (pathTl) pathTl.kill();
      if (colorTl) colorTl.kill();
      resizeObserver.disconnect();
    };
  }, { scope, dependencies: [borderWidth, effectiveRadius, gradientWidth, duration, colors, isCircle] });

  return (
    <div
      ref={scope}
      className={cn("relative overflow-hidden", outerClassName)}
      style={{
        "--cp-border-color": colors[0],
        padding: `${borderWidth}px`,
        borderRadius: `${effectiveRadius + borderWidth}px`,
        background: `rgba(255,255,255,0.04)`,
        border: `${borderWidth}px solid rgba(255,255,255,0.08)`,
      }}
    >
      <div
        className="cp-moving-gradient aspect-square absolute top-0 left-0"
        style={{ width: `${borderWidth}px` }}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square rounded-full"
          style={{
            width: `${gradientWidth || borderWidth * 10}px`,
            background: `radial-gradient(circle, var(--cp-border-color) 0%, transparent 70%)`,
          }}
        />
      </div>
      <div
        className={cn("relative z-30 bg-[#0c0c1a]", className)}
        style={{ borderRadius: `${effectiveRadius}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export default MovingBorder;
