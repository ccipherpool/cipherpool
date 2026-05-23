import { forwardRef } from "react";

// Button — unified button component using the CipherPool design system CSS classes
// variant: "primary" | "cyan" | "gold" | "ghost" | "outline" | "danger" | "mint"
// size: "sm" | "md" | "lg"

const VARIANTS = {
  primary: "cyber-btn cyber-btn-primary",
  cyan:    "cyber-btn cyber-btn-cyan",
  gold:    "cyber-btn cyber-btn-gold",
  ghost:   "cyber-btn cyber-btn-ghost",
  outline: "cyber-btn cyber-btn-outline",
  danger:  "cp-btn cp-btn-danger",
  mint:    "cp-btn cp-btn-mint",
};

const SIZES = {
  sm:  "cyber-btn-sm",
  md:  "",
  lg:  "cyber-btn-lg",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    disabled = false,
    loading = false,
    icon,
    iconRight,
    children,
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.primary;
  const sizeClass    = SIZES[size] ?? "";

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14, height: 14,
            borderRadius: "50%",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            display: "inline-block",
            animation: "cp-orbit 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
      ) : icon ? (
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && (
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{iconRight}</span>
      )}
    </button>
  );
});

export default Button;
export { Button };
