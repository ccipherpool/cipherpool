// Badge — unified chip/pill for status, labels, roles
// color: "purple" | "cyan" | "green" | "gold" | "red" | "slate"
// style: "soft" (default) | "neon"

const SOFT = {
  purple: "cp-badge cp-badge-violet",
  cyan:   "cp-badge cp-badge-cyan",
  green:  "cp-badge cp-badge-mint",
  gold:   "cp-badge cp-badge-gold",
  red:    "cp-badge cp-badge-red",
  // backward compat aliases
  primary:   "cp-badge cp-badge-violet",
  secondary: "cp-badge cp-badge-indigo",
  success:   "cp-badge cp-badge-mint",
  danger:    "cp-badge cp-badge-red",
  warning:   "cp-badge cp-badge-gold",
  info:      "cp-badge cp-badge-cyan",
  slate:     "cp-badge",
};

const NEON = {
  purple: "neon-badge neon-badge-cyber",
  cyan:   "neon-badge neon-badge-cyan",
  green:  "neon-badge neon-badge-green",
  gold:   "neon-badge neon-badge-gold",
  red:    "neon-badge neon-badge-red",
  slate:  "neon-badge neon-badge-cyber",
};

export default function Badge({
  color = "purple",
  variant,                // alias: maps old variant names to color
  style: badgeStyle = "soft",
  dot,
  icon,
  className = "",
  children,
  ...props
}) {
  const resolvedColor = variant
    ? (SOFT[variant] ? variant : "purple")
    : color;

  const map = badgeStyle === "neon" ? NEON : SOFT;
  const cls = map[resolvedColor] ?? map.purple;

  return (
    <span className={`${cls} ${className}`} {...props}>
      {dot && (
        <span className="inline-block rounded-full flex-shrink-0"
          style={{ width: 6, height: 6, background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
      )}
      {icon && (
        <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      )}
      {children}
    </span>
  );
}

export { Badge };
