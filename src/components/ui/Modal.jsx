import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Modal — portal-based, animated, keyboard-accessible
// variant: "default" | "cyber"
// Backward compat: also accepts isOpen prop

export default function Modal({
  open,
  isOpen,            // backward-compat alias
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
  size,              // backward-compat: "sm"|"md"|"lg"|"xl"|"2xl"
  variant = "default",
  hideClose = false,
  className = "",
}) {
  const isVisible = open ?? isOpen ?? false;

  const maxWidthValue = size
    ? { sm: 384, md: 448, lg: 512, xl: 576, "2xl": 672 }[size] ?? maxWidth
    : maxWidth;

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isVisible, onClose]);

  const backdropClass  = variant === "cyber" ? "cyber-modal-backdrop" : "cp-modal-backdrop";
  const containerClass = variant === "cyber" ? "cyber-modal" : "cp-modal";

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={backdropClass}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            className={`${containerClass} ${className}`}
            style={{ maxWidth: maxWidthValue }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  {title && (
                    <h2 className="font-heading font-bold text-lg leading-tight"
                      style={{ color: "var(--cp-text-1)" }}>
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm mt-1" style={{ color: "var(--cp-text-3)" }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "var(--cp-text-3)",
                      cursor: "pointer",
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--cp-text-1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--cp-text-3)"; }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )}

            <div>{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-3 mt-6 pt-5"
                style={{ borderTop: "1px solid var(--cp-border)" }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { Modal };
