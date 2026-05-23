import { useState, useEffect } from "react";
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "var(--cp-surface-1)",
        borderColor: isLive ? "rgba(239,68,68,.25)" : "var(--cp-border)",
        boxShadow: isLive ? "0 0 30px rgba(239,68,68,.08)" : "none",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] w-full flex-shrink-0"
        style={{
          background: isLive
            ? "linear-gradient(90deg, #ef4444, #f97316)"
            : isOpen
            ? "linear-gradient(90deg, var(--cp-mint), var(--cp-accent))"
            : "linear-gradient(90deg, rgba(124,58,237,.3), rgba(167,139,250,.2))",
        }}
      />

      {/* Banner area */}
      <div className="relative h-36 flex-shrink-0 overflow-hidden">
        {t.banner_url ? (
          <img
            src={t.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: isLive
                ? "linear-gradient(135deg, rgba(239,68,68,.1) 0%, rgba(249,115,22,.05) 100%)"
                : "linear-gradient(135deg, rgba(124,58,237,.08) 0%, rgba(6,182,212,.04) 100%)",
            }}
          />
        )}

        {/* Gradient overlay for readability */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, var(--cp-surface-1) 0%, rgba(0,0,0,.5) 50%, rgba(0,0,0,.2) 100%)" }}
        />

        {/* Faint background icon */}
        <Trophy
          size={56}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] transition-opacity group-hover:opacity-[0.12]"
          style={{ color: cfg.color }}
        />

        {/* Status badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border"
          style={{
            background: "rgba(0,0,0,.55)",
            borderColor: `${cfg.dot}33`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: cfg.dot,
              boxShadow: cfg.glow ? `0 0 6px ${cfg.glow}` : "none",
            }}
          />
          {isLive && (
            <span
              className="absolute w-1.5 h-1.5 rounded-full animate-ping opacity-40"
              style={{ background: cfg.dot }}
            />
          )}
          <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>

        {/* Prize pool badge (top-left) */}
        {t.prize_coins > 0 && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm border"
            style={{ background: "rgba(0,0,0,.55)", borderColor: "rgba(245,158,11,.3)" }}
          >
            <span className="text-[9px]">🏆</span>
            <span className="text-[10px] font-semibold" style={{ color: "var(--cp-gold)" }}>
              {t.prize_coins.toLocaleString()} CP
            </span>
          </div>
        )}

        {/* Tournament name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3
            className="text-sm font-semibold leading-tight truncate transition-colors group-hover:text-violet-300"
            style={{ color: "var(--cp-text-1)" }}
          >
            {t.name}
          </h3>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-3">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Prize",  value: t.prize_coins > 0 ? `${t.prize_coins.toLocaleString()} CP` : "—",      color: "var(--cp-gold)" },
            { label: "Entry",  value: t.entry_fee === 0 ? "FREE" : `${t.entry_fee} CP`,                       color: t.entry_fee === 0 ? "var(--cp-mint)" : "var(--cp-text-2)" },
            { label: "Mode",   value: t.mode || "SOLO",                                                        color: "var(--cp-cyan)" },
          ].map(s => (
            <div
              key={s.label}
              className="flex flex-col items-center py-2 rounded-xl border"
              style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}
            >
              <p className="text-[9px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--cp-text-4)" }}>
                {s.label}
              </p>
              <p className="text-[11px] font-semibold truncate" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Players progress */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users size={11} style={{ color: "var(--cp-text-4)" }} />
              <span className="text-[10px]" style={{ color: "var(--cp-text-4)" }}>Players</span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--cp-text-2)" }}>
              {t.current_players ?? 0}
              <span style={{ color: "var(--cp-text-4)" }}>/{t.max_players ?? "∞"}</span>
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--cp-surface-3)" }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 + 0.1 }}
              style={{
                background: progress >= 100
                  ? "var(--cp-gold)"
                  : "linear-gradient(90deg, var(--cp-accent), #a78bfa)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link to={`/tournaments/${t.id}`} className="mt-auto">
          <button
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.015] active:scale-[0.98]"
            style={
              isDone
                ? { background: "var(--cp-surface-3)", color: "var(--cp-text-4)", border: "1px solid var(--cp-border)", cursor: t.status === "cancelled" ? "not-allowed" : "pointer" }
                : isLive
                ? { background: "linear-gradient(135deg,#ef4444,#f97316)", color: "#fff", boxShadow: "0 4px 20px rgba(239,68,68,.25)" }
                : { background: "linear-gradient(135deg,var(--cp-accent),#9333ea)", color: "#fff", boxShadow: "0 4px 20px var(--cp-accent-glow)" }
            }
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
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          {/* Status pills */}
          <div className="flex items-center gap-2 mb-3">
            {liveCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.25)", color: "#ef4444" }}
              >
                <Radio size={9} />
                {liveCount} Live
              </span>
            )}
            {openCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                style={{ background: "var(--cp-mint-dim)", borderColor: "rgba(16,185,129,.25)", color: "var(--cp-mint)" }}
              >
                <Zap size={9} />
                {openCount} Open
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--cp-text-1)" }}>
            Tournament{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--cp-accent), #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Arena
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cp-text-3)" }}>
            Compete, win, and claim your rewards
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full md:w-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--cp-text-4)" }} />
          <input
            type="text"
            placeholder="Search tournaments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cp-input pl-9 w-full md:w-52 text-sm"
          />
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1"
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="relative px-4 py-2 rounded-xl text-xs font-medium flex-shrink-0 border transition-all duration-200"
              style={active
                ? { background: "var(--cp-accent-dim)", borderColor: "var(--cp-accent-border)", color: "var(--cp-accent)" }
                : { background: "var(--cp-surface-2)", borderColor: "var(--cp-border)", color: "var(--cp-text-3)" }
              }
            >
              {f.label}
            </button>
          );
        })}
        {search && (
          <span className="text-[10px] font-medium ml-1 flex-shrink-0" style={{ color: "var(--cp-text-4)" }}>
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
            className="cp-card py-20 text-center"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
            >
              <Sword size={24} style={{ color: "var(--cp-text-4)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--cp-text-3)" }}>
              {search ? "No tournaments match your search" : "No tournaments found"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--cp-text-4)" }}>
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
