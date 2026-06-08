import { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Search, Sword, Users, Coins,
  Radio, Zap, Clock, CheckCheck, XCircle,
} from "lucide-react";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  draft:             { label: "Draft",     color: "var(--cp-text-4)",   glow: null,        dot: "#475569" },
  published:         { label: "Upcoming",  color: "var(--cp-gold)",     glow: null,        dot: "#f59e0b" },
  registration_open: { label: "Open",      color: "var(--cp-mint)",     glow: "#10b981",   dot: "#10b981" },
  full:              { label: "Full",      color: "var(--cp-gold)",     glow: null,        dot: "#f59e0b" },
  ready:             { label: "Ready",     color: "var(--cp-cyan)",     glow: "#06b6d4",   dot: "#22d3ee" },
  live:              { label: "LIVE",      color: "#ef4444",            glow: "#ef4444",   dot: "#ef4444" },
  results_pending:   { label: "Results",   color: "var(--cp-accent)",   glow: null,        dot: "#8b5cf6" },
  completed:         { label: "Ended",     color: "var(--cp-text-4)",   glow: null,        dot: "#475569" },
  archived:          { label: "Archived",  color: "var(--cp-text-4)",   glow: null,        dot: "#374151" },
  cancelled:         { label: "Cancelled", color: "var(--cp-red)",      glow: null,        dot: "#ef4444" },
};

const FILTERS = [
  { key: "all",               label: "All"      },
  { key: "registration_open", label: "Open"     },
  { key: "live",              label: "Live"     },
  { key: "published",         label: "Upcoming" },
  { key: "completed",         label: "Ended"    },
];

// ─── Tournament card ──────────────────────────────────────────────────────────
const TCard = ({ t, i }) => {
  const [hov, setHov] = useState(false);
  const cfg     = STATUS[t.status] || STATUS.published;
  const isLive  = t.status === "live";
  const isOpen  = t.status === "registration_open";
  const isDone  = t.status === "completed" || t.status === "archived" || t.status === "cancelled";
  const progress = t.max_players > 0 ? Math.min((t.current_players / t.max_players) * 100, 100) : 0;

  const btnLabel = t.status === "completed" || t.status === "archived" ? "View Results"
    : t.status === "cancelled" ? "Cancelled"
    : isLive ? "Watch Live"
    : isOpen ? "Join Now"
    : "View Details";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.045, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", display: "flex", flexDirection: "column", overflow: "hidden",
        borderRadius: 20, border: `1px solid ${isLive ? "rgba(239,68,68,.28)" : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        background: "rgba(10,12,26,0.95)",
        boxShadow: isLive ? "0 0 32px rgba(239,68,68,.08)" : hov ? "0 16px 40px rgba(0,0,0,0.5)" : "none",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: 2, flexShrink: 0,
        background: isLive
          ? "linear-gradient(90deg, #ef4444, #f97316)"
          : isOpen
          ? "linear-gradient(90deg, #10b981, #7C3AED)"
          : `linear-gradient(90deg, ${cfg.dot}60, transparent)`,
      }} />

      {/* Banner */}
      <div style={{ position: "relative", height: 140, flexShrink: 0, overflow: "hidden" }}>
        {t.banner_url ? (
          <img src={t.banner_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.7s", transform: hov ? "scale(1.06)" : "scale(1)" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: isLive
              ? "linear-gradient(135deg, rgba(20,4,4,0.98), rgba(60,10,4,0.96))"
              : "linear-gradient(135deg, rgba(8,6,24,0.98), rgba(20,8,48,0.96))",
          }} />
        )}
        {/* Bottom gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,12,26,1) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.1) 100%)" }} />

        {/* Bg icon */}
        <Trophy size={52} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: cfg.color, opacity: hov ? 0.12 : 0.06, transition: "opacity 0.25s" }} />

        {/* Status badge */}
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 7px", borderRadius: 20, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: `1px solid ${cfg.dot}30` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, boxShadow: cfg.glow ? `0 0 6px ${cfg.glow}` : "none", flexShrink: 0 }} />
          {isLive && <span style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: cfg.dot, left: 7, opacity: 0.4 }} />}
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 0.3 }}>{cfg.label}</span>
        </div>

        {/* Prize badge */}
        {t.prize_coins > 0 && (
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(245,158,11,0.28)" }}>
            <span style={{ fontSize: 9 }}>🏆</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>{t.prize_coins.toLocaleString()} CP</span>
          </div>
        )}

        {/* Name */}
        <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", lineHeight: 1.3, transition: "color 0.2s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { label: "Prize",  value: t.prize_coins > 0 ? `${t.prize_coins.toLocaleString()} CP` : "—", color: "#f59e0b" },
            { label: "Entry",  value: t.entry_fee === 0 ? "FREE" : `${t.entry_fee} CP`,                  color: t.entry_fee === 0 ? "#10b981" : "rgba(255,255,255,0.6)" },
            { label: "Mode",   value: t.mode || "SOLO",                                                   color: "#06b6d4" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 3 }}>{s.label}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: s.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Players progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Users size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Players</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
              {t.current_players ?? 0}<span style={{ color: "rgba(255,255,255,0.25)" }}>/{t.max_players ?? "∞"}</span>
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 + 0.1 }}
              style={{ height: "100%", borderRadius: 5, background: progress >= 100 ? "#f59e0b" : "linear-gradient(90deg, #7C3AED, #a78bfa)" }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link to={`/tournaments/${t.id}`} style={{ marginTop: "auto", textDecoration: "none" }}>
          <button
            style={{
              width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700,
              cursor: t.status === "cancelled" ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              ...(isDone
                ? { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }
                : isLive
                ? { background: "linear-gradient(135deg,#ef4444,#f97316)", color: "#fff", boxShadow: "0 4px 20px rgba(239,68,68,0.3)", border: "none" }
                : { background: "linear-gradient(135deg,#7C3AED,#4f46e5)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.3)", border: "none" }
              )
            }}
          >
            {btnLabel}
          </button>
        </Link>
      </div>
    </motion.div>
  );
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ i }) => (
  <div
    className="rounded-2xl overflow-hidden border"
    style={{
      background: "var(--cp-surface-1)",
      borderColor: "var(--cp-border)",
      animationDelay: `${i * 0.05}s`,
    }}
  >
    <div className="h-[2px] cp-skeleton" />
    <div className="h-36 cp-skeleton" />
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(j => <div key={j} className="h-12 rounded-xl cp-skeleton" />)}
      </div>
      <div className="h-8 rounded-xl cp-skeleton" />
      <div className="h-10 rounded-xl cp-skeleton" />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Tournaments() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = tournaments.filter(t => {
    const matchFilter = filter === "all" || t.status === filter;
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const liveCount = tournaments.filter(t => t.status === "live").length;
  const openCount = tournaments.filter(t => t.status === "registration_open").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative", borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(135deg, rgba(8,6,24,0.98), rgba(20,8,48,0.96), rgba(4,18,40,0.97))",
          border: "1px solid rgba(255,255,255,0.08)", padding: "24px 28px",
        }}
      >
        {/* Aurora orbs */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(124,58,237,0.2)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: "40%", width: 160, height: 160, borderRadius: "50%", background: "rgba(6,182,212,0.12)", filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            {/* Status pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {liveCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171", fontSize: 10, fontWeight: 700 }}>
                  <Radio size={9} /> {liveCount} Live
                </span>
              )}
              {openCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontSize: 10, fontWeight: 700 }}>
                  <Zap size={9} /> {openCount} Open
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 800, color: "#f8fafc", margin: "0 0 5px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Tournament{" "}
              <span style={{ background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Arena
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>Compete, win, and claim your rewards</p>
          </div>

          {/* Search */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search tournaments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f8fafc", fontSize: 13, outline: "none", width: 200, fontFamily: "inherit" }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 2 }}
        className="scrollbar-hide"
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "7px 16px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer",
                flexShrink: 0, border: "1px solid", transition: "all 0.18s",
                background: active ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                borderColor: active ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)",
                color: active ? "#a78bfa" : "rgba(255,255,255,0.45)",
              }}
            >
              {f.label}
            </button>
          );
        })}
        {search && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500, flexShrink: 0, marginLeft: 4 }}>
            {filtered.length} result{filtered.length !== 1 && "s"}
          </span>
        )}
      </motion.div>

      {/* ── Grid ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div key="skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} i={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ borderRadius: 20, padding: "80px 20px", textAlign: "center", background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Sword size={22} style={{ color: "rgba(255,255,255,0.25)" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 4px" }}>
              {search ? "No tournaments match your search" : "No tournaments found"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>
              {search ? "Try a different search" : "Check back soon — new tournaments are added regularly"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((t, i) => (
              <TCard key={t.id} t={t} i={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
