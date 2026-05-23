import { forwardRef } from "react";

// Input — unified field component
// variant: "default" | "glow"

const Input = forwardRef(function Input(
  {
    variant = "default",
    label,
    hint,
    error,
    icon,
    iconRight,
    className = "",
    wrapClass = "",
    ...props
  },
  ref
) {
  const base = variant === "glow" ? "glow-input" : "cp-input";
  const errorStyle = error
    ? "!border-[rgba(239,68,68,0.40)] focus:!border-[rgba(239,68,68,0.60)] focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.10)]"
    : "";

  return (
    <div className={`flex flex-col gap-1.5 ${wrapClass}`}>
      {label && <label className="cp-label">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ display: "flex", alignItems: "center", color: "var(--cp-text-4)" }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`${base} ${icon ? "pl-10" : ""} ${iconRight ? "pr-10" : ""} ${errorStyle} ${className}`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{ display: "flex", alignItems: "center", color: "var(--cp-text-4)" }}>
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: "var(--cp-red)" }}>
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--cp-text-4)" }}>{hint}</p>
      )}
    </div>
  );
});

export default Input;
export { Input };
