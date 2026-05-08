import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Premium Button Component
 * Variants: primary (mint), secondary (gold), ghost, outline, danger
 * Sizes: sm, md, lg, xl
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
  const baseStyles = "relative inline-flex items-center justify-center font-heading font-black tracking-widest uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden";

  const variants = {
    primary: "bg-mint text-obsidian shadow-neon-mint hover:bg-mint-dark hover:scale-105 active:scale-95",
    secondary: "bg-cyber-gold text-obsidian shadow-neon-gold hover:bg-cyber-gold-dark hover:scale-105 active:scale-95",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
    outline: "border border-white/10 text-white hover:border-mint/50 hover:bg-mint/5",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-[10px] rounded-lg",
    md: "px-6 py-2.5 text-xs rounded-xl",
    lg: "px-8 py-3 text-sm rounded-xl",
    xl: "px-10 py-4 text-base rounded-2xl",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {/* Glow effect for primary/secondary */}
      {(variant === "primary" || variant === "secondary") && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
      )}
      
      <span className="relative z-10 flex items-center gap-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </span>
    </motion.button>
  );
}

export default Button;
