import React from "react";
import { cn } from "../../lib/utils";

export const BackgroundBeams = ({ className }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,white,transparent)]",
        className
      )}
    >
      <svg
        className="absolute h-full w-full opacity-50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="beams"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 40L40 0M-10 10L10 -10M30 50L50 30"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-200"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#beams)" />
      </svg>
    </div>
  );
};
