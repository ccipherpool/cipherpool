import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Input Component - Text Input with Variants
 */
export function Input({
  label,
  error,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            <Icon size={20} />
          </div>
        )}
        <motion.input
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={clsx(
            "w-full px-4 py-2 rounded-lg bg-bg-card border transition-all focus:outline-none focus:ring-2",
            Icon && "pl-10",
            error
              ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/30"
              : "border-primary-900/30 focus:border-primary-500 focus:ring-primary-500/30",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-danger-400 mt-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export default Input;
