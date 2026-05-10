import React from "react";
import { cn } from "@/lib/utils";

export function MovingBorder({
  children,
  className,
  outerClassName,
  borderWidth = 1,
  radius = 15,
  duration = 3,
  colors = ["#06b6d4", "#8B5CF6", "#F5C518"],
}) {
  const effectiveRadius = radius;

  return (
    <div
      className={cn(
        "relative p-[1px] overflow-hidden group transition-all duration-500",
        outerClassName
      )}
      style={{
        borderRadius: `${effectiveRadius + borderWidth}px`,
        background: `rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite]"
        style={{
          background: `conic-gradient(from 90deg at 50% 50%, ${colors.join(", ")}, ${colors[0]})`,
          animationDuration: `${duration}s`
        }}
      />
      <div
        className={cn("relative z-10 h-full w-full bg-obsidian-deep/90 backdrop-blur-xl", className)}
        style={{ borderRadius: `${effectiveRadius}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export default MovingBorder;
