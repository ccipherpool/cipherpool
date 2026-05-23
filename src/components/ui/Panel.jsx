// Panel — sectioned content block, commonly used in admin / detail views
// Lighter than Card — no hover effects, just clean surface + optional header

export default function Panel({
  title,
  subtitle,
  action,
  noPadding = false,
  accent,      // "purple" | "cyan" | "gold" — colored top border line
  className = "",
  children,
  ...props
}) {
  const accentColors = {
    purple: "rgba(124,58,237,0.5)",
    cyan:   "rgba(6,182,212,0.5)",
    gold:   "rgba(245,158,11,0.5)",
  };
  const accentColor = accent ? accentColors[accent] : null;

  return (
    <div
      className={`cp-command-panel relative ${noPadding ? "" : "p-5"} ${className}`}
      style={accentColor ? {
        "--panel-accent": accentColor,
        "--panel-accent2": accentColors[accent === "purple" ? "cyan" : "purple"],
      } : {}}
      {...props}
    >
      {/* Top gradient line */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor} 40%, ${accentColors[accent === "purple" ? "cyan" : "purple"] ?? accentColor} 70%, transparent)`,
          }}
        />
      )}

      {(title || action) && (
        <div className={`flex items-center justify-between gap-3 ${noPadding ? "px-5 pt-5" : ""} mb-4`}>
          <div className="min-w-0">
            {title && (
              <h3
                className="font-heading font-bold text-sm"
                style={{ color: "var(--cp-text-1)" }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--cp-text-3)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      {noPadding ? children : <div>{children}</div>}
    </div>
  );
}
