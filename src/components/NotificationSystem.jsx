import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  Wallet, 
  Trophy, 
  Bell, 
  Sparkles, 
  ShieldAlert,
  MessageSquare,
  Gift,
  Medal,
  ChevronRight,
  X
} from "lucide-react";
import { supabase } from "../lib/supabase";

const NotifCtx = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNotify() {
  const ctx = useContext(NotifCtx);
  if (!ctx) return () => {};
  return ctx.notify;
}

const META = {
  success: { icon: CheckCircle2, color: "text-mint", bg: "bg-mint/10", border: "border-mint/20" },
  error:   { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  warning: { icon: AlertCircle, color: "text-cyber-gold", bg: "bg-cyber-gold/10", border: "border-cyber-gold/20" },
  info:    { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  coin:    { icon: Wallet, color: "text-cyber-gold", bg: "bg-cyber-gold/10", border: "border-cyber-gold/20" },
  trophy:  { icon: Trophy, color: "text-mint", bg: "bg-mint/10", border: "border-mint/20" },
  live:    { icon: Sparkles, color: "text-mint", bg: "bg-mint/10", border: "border-mint/20" },
  kick:    { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  chat:    { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

function ToastItem({ notif, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const m = META[notif.type] || META.info;
  const Icon = m.icon;
  const dur = notif.duration || 5000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(notif.id), 300);
  }, [notif.id, onRemove]);

  useEffect(() => {
    if (notif.actions?.length > 0) return;
    const t = setTimeout(dismiss, dur);
    return () => clearTimeout(t);
  }, [dismiss, dur, notif.actions]);

  return (
    <motion.div
      layout
      initial={{ x: 50, opacity: 0, scale: 0.9 }}
      animate={exiting ? { x: 50, opacity: 0, scale: 0.9 } : { x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 50, opacity: 0, scale: 0.9 }}
      className={`relative glass-card !p-0 overflow-hidden w-80 shadow-2xl ${m.border}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.color.replace('text-', 'bg-')}`} />
      
      <div className="p-4 flex gap-4">
        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${m.bg} ${m.color}`}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          {notif.title && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-50">
              {notif.title}
            </p>
          )}
          <p className="text-sm font-bold text-white leading-tight mb-1">
            {notif.message}
          </p>

          {notif.actions?.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notif.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => { action.onClick(); dismiss(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={dismiss}
          className="p-1 text-slate-600 hover:text-white transition-colors self-start"
        >
          <X size={14} />
        </button>
      </div>

      {!notif.actions?.length && (
        <div className="h-0.5 w-full bg-white/5">
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: dur / 1000, ease: "linear" }}
            className={`h-full ${m.color.replace('text-', 'bg-')}`}
          />
        </div>
      )}
    </motion.div>
  );
}

export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState([]);

  const notify = useCallback((type = "info", title = "", message = "", duration = 5000, actions = null) => {
    const id = Date.now() + Math.random();
    setNotifs(prev => [...prev.slice(-4), { id, type, title, message, duration, actions }]);
  }, []);

  const remove = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  // Realtime subscriptions (Simplified for redesign demo)
  useEffect(() => {
    // We would re-add all the realtime logic here
    // For now, let's just make sure the UI is ready
  }, [notify]);

  return (
    <NotifCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifs.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <ToastItem notif={n} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </NotifCtx.Provider>
  );
}
