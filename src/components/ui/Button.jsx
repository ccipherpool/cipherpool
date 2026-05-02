import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Button Component - Multiple Variants
 * Variants: primary, secondary, ghost, outline, danger, success
 * Sizes: sm, md, lg
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const baseStyles = "font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 disabled:bg-primary-400",
    secondary: "bg-secondary-600 hover:bg-secondary-700 text-white focus:ring-secondary-500 disabled:bg-secondary-400",
    ghost: "bg-transparent hover:bg-bg-hover text-text-primary focus:ring-primary-500 disabled:opacity-50",
    outline: "border-2 border-primary-500 text-primary-300 hover:bg-primary-500/10 focus:ring-primary-500 disabled:opacity-50",
    danger: "bg-danger-600 hover:bg-danger-700 text-white focus:ring-danger-500 disabled:bg-danger-400",
    success: "bg-accent-600 hover:bg-accent-700 text-white focus:ring-accent-500 disabled:bg-accent-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}

export default Button;
