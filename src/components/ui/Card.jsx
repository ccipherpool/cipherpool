// Card — base surface component using CipherPool design system
// variant: "default" | "luxury" | "glass" | "cyan" | "gold"

const VARIANTS = {
  default: "cp-card",
  luxury:  "luxury-card",
  glass:   "cp-card-glass",
  cyan:    "luxury-card luxury-card-cyan",
  gold:    "luxury-card luxury-card-gold",
};

export default function Card({
  variant = "default",
  className = "",
  padding = "p-5",
  children,
  as: Tag = "div",
  glow,
  onClick,
  ...props
}) {
  const glowClass = glow === "purple" ? "glow-indigo"
    : glow === "gold" ? "glow-gold"
    : glow === "cyan" ? "glow-on-hover"
    : "";

  return (
    <Tag
      className={`${VARIANTS[variant] ?? VARIANTS.default} ${padding} ${glowClass} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Tag>
  );
}

Card.Header = function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ className = "", children, ...props }) {
  return (
    <h3 className={`font-heading font-bold text-base leading-tight ${className}`}
      style={{ color: "var(--cp-text-1)" }} {...props}>
      {children}
    </h3>
  );
};

Card.Divider = function CardDivider({ className = "" }) {
  return <div className={`cp-separator my-4 ${className}`} />;
};

export { Card };
export function CardHeader({ children, className = "" }) {
  return <div className={`flex items-center justify-between gap-3 mb-4 ${className}`}>{children}</div>;
}
export function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}
export function CardFooter({ children, className = "" }) {
  return (
    <div className={`flex gap-2 justify-end mt-4 pt-4 ${className}`}
      style={{ borderTop: "1px solid var(--cp-border)" }}>
      {children}
    </div>
  );
}
