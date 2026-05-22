import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const BACKDROP = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const PANEL = {
  hidden:  { opacity: 0, scale: 0.93, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.18 } },
};

export function CyberModal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-xl', className = '' }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cyber-modal-backdrop"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            className={cn('cyber-modal', maxWidth, className)}
            variants={PANEL}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  {title && (
                    <h2 className="font-heading text-xl font-black tracking-tight text-white">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-white/40 mt-1">{subtitle}</p>
                  )}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/06 transition-all shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
