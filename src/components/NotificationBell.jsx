import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, Trophy, Megaphone, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { supabase } from "../lib/supabase";

const TYPE_META = {
  warning:     { icon: AlertTriangle, color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  update:      { icon: RefreshCw,    color: "#818cf8", bg: "rgba(129,140,248,.1)" },
  tournament:  { icon: Trophy,       color: "#f97316", bg: "rgba(249,115,22,.1)" },
  announcement:{ icon: Megaphone,    color: "#10b981", bg: "rgba(16,185,129,.1)" },
};
const defaultMeta = { icon: Info, color: "#818cf8", bg: "rgba(129,140,248,.1)" };

function getMeta(type) { return TYPE_META[type] || defaultMeta; }

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  const unread = notifs.filter(n => !n.read).length;

  const fetch = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .or(`user_id.eq.${userId},is_global.eq.true`)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    if (!userId) return;
    const ch = supabase
      .channel("notif_" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_messages" }, () => fetch())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_messages" }, () => fetch())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userId]);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const markOne = async (id) => {
    await supabase.from("admin_messages").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAll = async () => {
    const ids = notifs.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("admin_messages").update({ read: true }).in("id", ids);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: open ? "rgba(99,102,241,.12)" : "transparent", border: open ? "1px solid rgba(99,102,241,.25)" : "1px solid transparent" }}
      >
        <motion.div
          animate={unread > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 4 }}
        >
          <Bell size={17} style={{ color: unread > 0 ? "#818cf8" : "rgba(255,255,255,.4)" }} />
        </motion.div>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
            style={{ background: "linear-gradient(135deg,#f43f5e,#f97316)" }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: [.22, 1, .36, 1] }}
            className="absolute right-0 top-full mt-2 z-50 w-80"
            style={{ background: "#080820", border: "1px solid rgba(99,102,241,.2)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(99,102,241,.08)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div className="flex items-center gap-2">
                <Bell size={14} style={{ color: "#818cf8" }} />
                <span className="text-sm font-bold text-white">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8" }}>
                    {unread} non lues
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAll} title="Tout marquer lu"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                    style={{ color: "#818cf8" }}>
                    <CheckCheck size={13} />
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,.3)" }}>
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="text-3xl opacity-20">🔔</div>
                  <p className="text-[12px] text-white/25 font-mono uppercase tracking-widest">Aucune notification</p>
                </div>
              ) : (
                notifs.map((n, i) => {
                  const meta = getMeta(n.type);
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => !n.read && markOne(n.id)}
                      className="flex gap-3 px-4 py-3 cursor-pointer transition-all"
                      style={{
                        background: n.read ? "transparent" : "rgba(99,102,241,.04)",
                        borderBottom: "1px solid rgba(255,255,255,.04)",
                        borderLeft: `3px solid ${n.read ? "transparent" : meta.color}`,
                      }}
                      onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = "rgba(99,102,241,.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : "rgba(99,102,241,.04)"; }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.bg }}>
                        <Icon size={14} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12.5px] font-bold text-white leading-tight truncate">{n.title || "Notification"}</p>
                          <span className="text-[10px] text-white/25 font-mono shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-[11.5px] text-white/45 leading-relaxed mt-0.5 line-clamp-2">{n.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono" style={{ color: meta.color }}>
                            {n.is_global ? "📢 Général" : "📩 Personnel"}
                          </span>
                          {!n.read && (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Non lue
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {notifs.length > 0 && (
              <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <p className="text-[10px] text-center text-white/20 font-mono">Notifications des 30 derniers jours</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
