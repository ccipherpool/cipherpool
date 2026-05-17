import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Search, Sword, Users2, Wallet,
  ChevronRight, Zap, Flame, Star, Crown,
} from "lucide-react";

const STATUS_MAP = {
  draft:             { label: "Draft",         dot: "#475569" },
  published:         { label: "Upcoming",      dot: "#f59e0b" },
  registration_open: { label: "Open",          dot: "#10b981" },
  full:              { label: "Full",           dot: "#f59e0b" },
  ready:             { label: "Ready",          dot: "#22d3ee" },
  live:              { label: "Live",           dot: "#ef4444" },
  results_pending:   { label: "Results",       dot: "#a78bfa" },
  completed:         { label: "Ended",         dot: "#475569" },
  archived:          { label: "Archived",      dot: "#374151" },
  cancelled:         { label: "Cancelled",     dot: "#ef4444" },
};

const FILTERS = [
  { key: "all",              label: "All"         },
  { key: "registration_open", label: "Open"       },
  { key: "live",             label: "Live"        },
  { key: "published",        label: "Upcoming"    },
  { key: "completed",        label: "Ended"       },
];

// ─── TOURNAMENT CARD ─────────────────────────────────────────────────────────
const TCard = ({ t, i, balance }) => {
  const cfg = STATUS_MAP[t.status] || STATUS_MAP.published;
  const progress = t.max_players > 0 ? Math.min((t.current_players / t.max_players) * 100, 100) : 0;
  const isLive = t.status === "live";
  const isOpen = t.status === "registration_open";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="cp-card group overflow-hidden flex flex-col h-full"
    >
      {/* Card top accent */}
      <div
        className="h-[3px] w-full"
        style={{
          background: isLive
            ? "linear-gradient(90deg, #ef4444, #f97316)"
            : isOpen
            ? "linear-gradient(90deg, #10b981, #6366f1)"
            : "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(167,139,250,0.3))",
        }}
      />

      {/* Card header */}
      <div className="relative overflow-hidden h-36 flex-shrink-0">
        {t.banner_url ? (
          <img
            src={t.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: isLive
                ? "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(249,115,22,0.06) 100%)"
                : "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.05) 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1220] via-[#0d1220]/40 to-transparent" />

        {/* HUD icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <Trophy size={64} className="text-white" />
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] backdrop-blur-sm">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: cfg.dot, boxShadow: isLive ? `0 0 6px ${cfg.dot}` : "none" }}
          />
          {isLive && <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: cfg.dot }} />}
          <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">{cfg.label}</span>
        </div>

        {/* Title */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-[13px] font-black text-white uppercase tracking-wide leading-tight truncate group-hover:text-cp-indigo-light transition-colors duration-[220ms]">
            {t.name}
          </h3>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Prize", value: `${(t.prize_coins || 0).toLocaleString()} CP`, color: "#f59e0b" },
            { label: "Entry", value: t.entry_fee === 0 ? "FREE" : `${t.entry_fee} CP`, color: "rgba(255,255,255,0.8)" },
            { label: "Mode",  value: t.mode || "SOLO", color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="text-center py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
              <p className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mb-0.5">{s.label}</p>
              <p className="text-[10px] font-black uppercase truncate" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Slots progress */}
        <div>
          <div className="flex justify-between text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest mb-1.5">
            <span>Players</span>
            <span className="text-[rgba(255,255,255,0.6)]">{t.current_players ?? 0} / {t.max_players ?? "∞"}</span>
          </div>
          <div className="cp-progress">
            <motion.div
              className="cp-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{
                background: progress >= 100
                  ? "#f59e0b"
                  : "linear-gradient(90deg, #6366f1, #818cf8)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Link to={`/tournaments/${t.id}`}>
            <button
              className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-[220ms] ${
                t.status === "completed" || t.status === "archived" || t.status === "cancelled"
                  ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)] cursor-not-allowed border border-[rgba(255,255,255,0.05)]"
                  : isLive
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-gradient-to-r from-cp-indigo to-cp-indigo-light text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {t.status === "completed" || t.status === "archived" ? "View Results"
                : t.status === "cancelled" ? "Cancelled"
                : isLive ? "Watch Live"
                : isOpen ? "Join Tournament"
                : "View Details"}
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Tournaments() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

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
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const liveCount = tournaments.filter(t => t.status === "live").length;
  const openCount = tournaments.filter(t => t.status === "registration_open").length;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[8px] font-black text-red-400 uppercase tracking-[0.2em]">{liveCount} Live</span>
              </span>
            )}
            {openCount > 0 && (
              <span className="text-[9px] font-black text-[rgba(16,185,129,0.6)] uppercase tracking-widest">
                {openCount} Open
              </span>
            )}
          </div>
          <h1 className="text-[2rem] md:text-[2.8rem] font-heading font-black text-white uppercase tracking-tighter leading-[0.9]">
            Tournament<br />
            <span style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Arena
            </span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative group max-w-xs w-full md:w-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-cp-indigo transition-colors duration-[220ms]" />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cp-input pl-9 w-full md:w-56"
          />
        </div>
      </motion.div>

      {/* ── FILTER TABS ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-wrap items-center gap-2"
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`relative px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-[220ms] ${
              filter === f.key
                ? "text-white bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.35)]"
                : "text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            {filter === f.key && (
              <motion.div
                layoutId="tour-filter-bg"
                className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(99,102,241,0.08)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{f.label}</span>
          </button>
        ))}
        {search && (
          <span className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">
            {filtered.length} result{filtered.length !== 1 && "s"}
          </span>
        )}
      </motion.div>

      {/* ── GRID ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div key="skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="cp-skeleton h-80 rounded-[16px]" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cp-card py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-4">
              <Sword size={28} className="text-[rgba(255,255,255,0.12)]" />
            </div>
            <p className="text-[11px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] mb-1">
              No Tournaments Found
            </p>
            <p className="text-[10px] text-[rgba(255,255,255,0.15)]">
              {search ? "Try different search terms" : "Check back soon"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((t, i) => (
              <TCard key={t.id} t={t} i={i} balance={profile?.balance} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
