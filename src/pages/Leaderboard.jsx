import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useOutletContext, Link } from "react-router-dom";
import {
  Trophy, Crown, Search, Medal, Star,
  TrendingUp, Zap, ChevronUp, ChevronDown,
  Loader2, AlertCircle, Users,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────
function initialsFrom(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
}
function timeSince(d) {
  if (!d) return null;
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, url, size = 36 }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-white"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.26),
        background: url ? "transparent" : "linear-gradient(135deg,rgba(124,58,237,.6),rgba(6,182,212,.4))",
        fontSize: size * 0.38,
        border: "1px solid var(--cp-border)",
      }}
    >
      {url
        ? <img src={url} alt="" onError={e => { e.target.style.display = "none"; }} className="w-full h-full object-cover" />
        : initialsFrom(name)
      }
    </div>
  );
}

// ─── Rank medal ───────────────────────────────────────────────────────────────
const RANK_CFG = {
  1: { color: "#f59e0b", glow: "rgba(245,158,11,.2)",  label: "Champion",  icon: Crown  },
  2: { color: "#94a3b8", glow: "rgba(148,163,184,.1)", label: "2nd Place", icon: Medal  },
  3: { color: "#f97316", glow: "rgba(249,115,22,.12)", label: "3rd Place", icon: Star   },
};

// ─── Podium Card ──────────────────────────────────────────────────────────────
function PodiumCard({ player, rank }) {
  const cfg = RANK_CFG[rank];
  const Icon = cfg.icon;
  const isFirst = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: isFirst ? -16 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col items-center rounded-2xl p-5 border text-center overflow-hidden ${isFirst ? "md:-mt-5 md:pb-7" : ""}`}
      style={{
        background: `linear-gradient(160deg, var(--cp-surface-2) 0%, var(--cp-surface-1) 100%)`,
        borderColor: `${cfg.color}30`,
        boxShadow: isFirst ? `0 0 40px ${cfg.glow}` : "none",
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg,transparent,${cfg.color},transparent)` }} />

      {/* Rank badge */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
        style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}44` }}
      >
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Avatar */}
      <div className="relative mb-3">
        {isFirst && (
          <div
            className="absolute -inset-2 rounded-full opacity-25 animate-pulse"
            style={{ background: `radial-gradient(circle, ${cfg.color}, transparent 70%)` }}
          />
        )}
        <div
          className="overflow-hidden flex items-center justify-center font-bold text-white"
          style={{
            width: isFirst ? 80 : 60,
            height: isFirst ? 80 : 60,
            borderRadius: "50%",
            border: `2px solid ${cfg.color}55`,
            background: player.avatar_url ? "transparent" : `linear-gradient(135deg, ${cfg.color}22, var(--cp-surface-3))`,
            fontSize: isFirst ? 28 : 20,
          }}
        >
          {player.avatar_url
            ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
            : initialsFrom(player.username)
          }
        </div>
      </div>

      <h3 className="text-sm font-semibold truncate max-w-[110px]" style={{ color: "var(--cp-text-1)" }}>
        {player.username}
      </h3>
      <p className="text-[10px] font-semibold mt-0.5" style={{ color: cfg.color }}>
        {cfg.label}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--cp-text-4)" }}>
        Lv {player.level || 1}
      </p>

      {/* Score */}
      <div
        className="mt-4 pt-4 w-full border-t"
        style={{ borderColor: "var(--cp-border)" }}
      >
        <p
          className="text-xl font-bold tabular-nums"
          style={{ color: isFirst ? cfg.color : "var(--cp-text-1)" }}
        >
          {(player.display_score || player.xp || 0).toLocaleString()}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "var(--cp-text-4)" }}>
          {player.score_label || "XP"}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "score",  label: "XP",        icon: Zap      },
  { key: "level",  label: "Level",     icon: TrendingUp },
  { key: "wins",   label: "Wins",      icon: Trophy   },
  { key: "coins",  label: "Coins",     icon: Star     },
];

// ─── Player row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, idx, isMe, sortKey }) {
  const rankColor =
    player.rank === 1 ? "#f59e0b" :
    player.rank === 2 ? "#94a3b8" :
    player.rank === 3 ? "#f97316" :
    "var(--cp-text-4)";

  const scoreValue =
    sortKey === "level"  ? (player.level || 1) :
    sortKey === "wins"   ? (player.wins || 0) :
    sortKey === "coins"  ? (player.coins || 0).toLocaleString() :
    (player.display_score || player.xp || 0).toLocaleString();

  const scoreLabel =
    sortKey === "level"  ? "LVL" :
    sortKey === "wins"   ? "WINS" :
    sortKey === "coins"  ? "CP" :
    player.score_label || "XP";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.3 }}
      className={`group flex items-center gap-3 px-4 py-3 border-l-2 transition-all duration-150 ${
        isMe
          ? "border-l-violet-500 bg-violet-500/[0.06]"
          : "border-l-transparent hover:bg-white/[0.025] hover:border-l-white/10"
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {player.rank <= 3 ? (
          <span className="text-base">
            {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-xs font-semibold tabular-nums" style={{ color: rankColor }}>
            {player.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar name={player.username} url={player.avatar_url} size={34} />

      {/* Name + level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/profile/${player.id}`}
            className="text-sm font-medium truncate transition-colors hover:text-violet-400"
            style={{ color: isMe ? "var(--cp-accent)" : "var(--cp-text-1)" }}
          >
            {player.username}
            {isMe && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
          </Link>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--cp-text-4)" }}>
          Level {player.level || 1}
          {player.last_seen && <span className="ml-2">{timeSince(player.last_seen)}</span>}
        </p>
      </div>

      {/* XP / score */}
      <div className="text-right hidden sm:block flex-shrink-0">
        <p className="text-sm font-semibold tabular-nums transition-colors group-hover:text-amber-400" style={{ color: "var(--cp-text-1)" }}>
          {scoreValue}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--cp-text-4)" }}>
          {scoreLabel}
        </p>
      </div>

      {/* Wins */}
      <div className="text-right hidden md:block flex-shrink-0 w-12">
        <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--cp-mint)" }}>
          {player.wins || 0}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--cp-text-4)" }}>wins</p>
      </div>

      {/* Coins */}
      <div className="text-right hidden lg:block flex-shrink-0 w-16">
        <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--cp-gold)" }}>
          {(player.coins || 0).toLocaleString()}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--cp-text-4)" }}>CP</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const { profile: me } = useOutletContext() || {};
  const [rawPlayers, setRawPlayers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState("score");
  const [sortDir,    setSortDir]    = useState("desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Load profiles — always available source of truth
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, level, xp, coins, wins, kills, deaths, fair_play_score, last_seen")
          .order("xp", { ascending: false })
          .limit(150);

        if (profErr) throw profErr;
        if (!profiles?.length) { setRawPlayers([]); setLoading(false); return; }

        // Step 2: Try player_stats to enrich (may not exist or may be empty)
        let statsMap = {};
        try {
          const { data: stats } = await supabase
            .from("player_stats")
            .select("user_id, total_points, kills, wins, tournaments_played");
          if (stats?.length) {
            statsMap = Object.fromEntries(stats.map(s => [s.user_id, s]));
          }
        } catch (_) {} // silent — player_stats may not exist

        // Step 3: Merge and rank
        const enriched = profiles.map(p => {
          const st = statsMap[p.id] || {};
          const wins   = st.wins  ?? p.wins  ?? 0;
          const kills  = st.kills ?? p.kills ?? 0;
          const xp     = p.xp    ?? 0;
          const coins  = p.coins ?? 0;
          const level  = p.level ?? 1;
          // Primary score: total_points from player_stats if available, else derive from xp
          const display_score = st.total_points ?? xp;
          const score_label   = st.total_points != null ? "Points" : "XP";
          // Ranking score for sorting
          const score = display_score * 1 + level * 100 + wins * 50;
          return { ...p, wins, kills, xp, coins, level, display_score, score_label, score };
        });

        // Sort by derived score descending for initial rank
        enriched.sort((a, b) => b.score - a.score);
        const ranked = enriched.map((p, i) => ({ ...p, rank: i + 1 }));
        setRawPlayers(ranked);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
        setError(e.message || "Failed to load rankings");
      }
      setLoading(false);
    })();
  }, []);

  // Sort
  const sortedPlayers = useMemo(() => {
    const sorted = [...rawPlayers].sort((a, b) => {
      const va = sortKey === "score" ? a.display_score :
                 sortKey === "level" ? a.level :
                 sortKey === "wins"  ? a.wins :
                 a.coins;
      const vb = sortKey === "score" ? b.display_score :
                 sortKey === "level" ? b.level :
                 sortKey === "wins"  ? b.wins :
                 b.coins;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
  }, [rawPlayers, sortKey, sortDir]);

  // Search filter
  const filtered = useMemo(() =>
    search
      ? sortedPlayers.filter(p => p.username?.toLowerCase().includes(search.toLowerCase()))
      : sortedPlayers,
    [sortedPlayers, search]
  );

  const top3 = !search ? filtered.slice(0, 3) : [];
  const rest  = !search ? filtered.slice(3)   : filtered;
  const myEntry = rawPlayers.find(p => p.id === me?.id);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

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
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={12} style={{ color: "var(--cp-gold)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--cp-gold)" }}>
              Global Rankings
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--cp-text-1)" }}>
            Hall of{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--cp-gold), #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Champions
            </span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cp-text-3)" }}>
            Real-time rankings — {rawPlayers.length} players ranked
          </p>
        </div>

        <div className="flex items-center gap-3">
          {myEntry && (
            <div
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: "var(--cp-accent-dim)", borderColor: "var(--cp-accent-border)" }}
            >
              <Medal size={12} style={{ color: "var(--cp-accent)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--cp-text-2)" }}>
                Your rank: <span className="font-bold" style={{ color: "var(--cp-text-1)" }}>#{myEntry.rank}</span>
              </span>
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--cp-text-4)" }} />
            <input
              type="text"
              placeholder="Search players…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cp-input pl-9 w-full md:w-52 text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Sort tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
          const active = sortKey === key;
          return (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 border transition-all"
              style={active
                ? { background: "var(--cp-accent-dim)", borderColor: "var(--cp-accent-border)", color: "var(--cp-accent)" }
                : { background: "var(--cp-surface-2)", borderColor: "var(--cp-border)", color: "var(--cp-text-3)" }
              }
            >
              <Icon size={11} />
              {label}
              {active && (
                sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: "var(--cp-red-dim)", borderColor: "rgba(239,68,68,.2)", color: "var(--cp-red)" }}
        >
          <AlertCircle size={15} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Podium ── */}
      {!loading && !error && !search && top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <PodiumCard player={top3[1]} rank={2} />
          <PodiumCard player={top3[0]} rank={1} />
          <PodiumCard player={top3[2]} rank={3} />
        </div>
      )}

      {/* ── Table card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="cp-card overflow-hidden"
      >
        {/* Table header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={13} style={{ color: "var(--cp-text-4)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--cp-text-3)" }}>
              {search ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `Top ${rawPlayers.length} players`}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 pr-2">
            {[
              { key: "score", label: rawPlayers[0]?.score_label || "XP", visible: true    },
              { key: "wins",  label: "Wins",                              visible: true    },
              { key: "coins", label: "CP",                                visible: "lg"   },
            ].map(h => (
              <button
                key={h.key}
                onClick={() => handleSort(h.key)}
                className={`flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider w-16 justify-end transition-colors hover:text-white ${h.visible === "lg" ? "hidden lg:flex" : ""}`}
                style={{ color: sortKey === h.key ? "var(--cp-accent)" : "var(--cp-text-4)" }}
              >
                {h.label}
                {sortKey === h.key && (sortDir === "desc" ? <ChevronDown size={9} /> : <ChevronUp size={9} />)}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="p-3 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="cp-skeleton h-14 rounded-xl" style={{ animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 opacity-50">
            <Users size={28} style={{ color: "var(--cp-text-4)" }} />
            <p className="text-sm" style={{ color: "var(--cp-text-4)" }}>
              {search ? "No players match your search" : "No ranking data available yet"}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && (
          <div className="divide-y" style={{ borderColor: "var(--cp-border)" }}>
            {rest.map((p, i) => (
              <PlayerRow
                key={p.id}
                player={p}
                idx={i}
                isMe={p.id === me?.id}
                sortKey={sortKey}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
