import clsx from "clsx";

/**
 * Badge Component - Status/Label Badge
 * Variants: primary, secondary, success, danger, warning, info
 */
export function Badge({ children, variant = "primary", className = "" }) {
  const variants = {
    primary: "bg-primary-500/20 text-primary-300 border border-primary-500/30",
    secondary: "bg-secondary-500/20 text-secondary-300 border border-secondary-500/30",
    success: "bg-accent-500/20 text-accent-300 border border-accent-500/30",
    danger: "bg-danger-500/20 text-danger-300 border border-danger-500/30",
    warning: "bg-warning-500/20 text-warning-300 border border-warning-500/30",
    info: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
