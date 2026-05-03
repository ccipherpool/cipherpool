import { useState } from "react";
import { cn } from "@/lib/utils";

const ratingData = [
  { emoji: "😔", label: "Terrible", color: "from-red-400 to-red-500" },
  { emoji: "😕", label: "Poor",     color: "from-orange-400 to-orange-500" },
  { emoji: "😐", label: "Okay",     color: "from-yellow-400 to-yellow-500" },
  { emoji: "🙂", label: "Good",     color: "from-lime-400 to-lime-500" },
  { emoji: "😍", label: "Amazing",  color: "from-emerald-400 to-emerald-500" },
];

export function RatingInteraction({ onChange, className }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value) => {
    setRating(value);
    onChange?.(value);
  };

  const displayRating = hoverRating || rating;
  const activeData = displayRating > 0 ? ratingData[displayRating - 1] : null;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex items-center gap-3">
        {ratingData.map((item, i) => {
          const value = i + 1;
          const isActive = value <= displayRating;
          return (
            <button
              key={value}
              onClick={() => handleClick(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="group relative focus:outline-none"
              aria-label={`Rate ${value}: ${item.label}`}
            >
              <div className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                isActive ? "scale-110" : "scale-100 group-hover:scale-105"
              )}>
                <span className={cn(
                  "text-2xl transition-all duration-300 ease-out select-none",
                  isActive ? "grayscale-0 drop-shadow-lg" : "grayscale opacity-40 group-hover:opacity-70"
                )}>
                  {item.emoji}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="relative h-6 w-28">
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
          displayRating > 0 ? "opacity-0 blur-md scale-95" : "opacity-100 blur-0 scale-100"
        )}>
          <span className="text-xs font-medium text-white/40">Rate us</span>
        </div>
        {ratingData.map((item, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
              displayRating === i + 1 ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105"
            )}
          >
            <span className="text-xs font-semibold tracking-wide text-white">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RatingInteraction;
