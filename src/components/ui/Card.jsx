import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Card Component - Base Card with Variants
 * Variants: default, hover, glow, gradient
 */
export function Card({
  children,
  variant = "default",
  className = "",
  onClick = null,
  ...props
}) {
  const baseStyles = "rounded-xl border transition-all";

  const variants = {
    default: "bg-bg-card border-primary-900/30 hover:border-primary-500/50",
    hover: "bg-bg-card border-primary-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 cursor-pointer",
    glow: "bg-gradient-to-br from-primary-600/10 to-secondary-600/10 border-primary-500/30 hover:border-primary-500/50 hover:shadow-glow-primary",
    gradient: "bg-gradient-to-br from-primary-600/20 to-secondary-600/20 border-primary-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={clsx(
        baseStyles,
        variants[variant],
        onClick && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={clsx("px-6 py-4 border-b border-primary-900/20", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={clsx("px-6 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={clsx("px-6 py-4 border-t border-primary-900/20 flex gap-2 justify-end", className)}>
      {children}
    </div>
  );
}

export default Card;
