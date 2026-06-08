import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useOutletContext, Link } from "react-router-dom";
import {
  Trophy, Crown, Search, Medal, Star,
  TrendingUp, Zap, ChevronUp, ChevronDown,
  AlertCircle, Users, Coins,
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
function Avatar({ name, url, size = 36, ring }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-white"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.28),
        background: url ? "transparent" : "linear-gradient(135deg,rgba(124,58,237,.55),rgba(6,182,212,.38))",
        fontSize: size * 0.38,
        border: ring ? `2px solid ${ring}` : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {url
        ? <img src={url} alt="" onError={e => { e.target.style.display = "none"; }} className="w-full h-full object-cover" />
        : initialsFrom(name)
      }
    </div>
  );
}

// ─── Rank medal config ────────────────────────────────────────────────────────
const RANK_CFG = {
  1: { color: "#f59e0b", glow: "rgba(245,158,11,.35)",  shadow: "rgba(245,158,11,.15)", label: "Champion",  icon: Crown,  gradient: "linear-gradient(135deg,#f59e0b22,#f59e0b08)" },
  2: { color: "#94a3b8", glow: "rgba(148,163,184,.2)",  shadow: "rgba(148,163,184,.08)", label: "2nd Place", icon: Medal,  gradient: "linear-gradient(135deg,#94a3b818,#94a3b808)" },
  3: { color: "#f97316", glow: "rgba(249,115,22,.2)",   shadow: "rgba(249,115,22,.08)", label: "3rd Place", icon: Star,   gradient: "linear-gradient(135deg,#f9731618,#f9731608)" },
};

// ─── Podium Card ──────────────────────────────────────────────────────────────
function PodiumCard({ player, rank }) {
  const cfg = RANK_CFG[rank];
  const Icon = cfg.icon;
  const isFirst = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: isFirst ? -20 : 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: rank * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col items-center rounded-2xl p-6 border text-center overflow-hidden ${isFirst ? "md:-mt-6 md:pb-8" : ""}`}
      style={{
        background: cfg.gradient,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: `${cfg.color}28`,
        boxShadow: isFirst
          ? `0 0 0 1px ${cfg.color}18, 0 20px 60px ${cfg.shadow}, 0 0 80px ${cfg.glow}`
          : `0 4px 24px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg,transparent,${cfg.color}88,transparent)` }}
      />

      {/* Glow orb behind avatar for #1 */}
      {isFirst && (
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, filter: "blur(12px)" }}
        />
      )}

      {/* Rank badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 flex-shrink-0 relative z-10"
        style={{
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}35`,
          boxShadow: `0 0 16px ${cfg.color}22`,
        }}
      >
        <Icon size={15} style={{ color: cfg.color }} />
      </div>

      {/* Avatar */}
      <div className="relative mb-4 z-10">
        {isFirst && (
          <div
            className="absolute -inset-3 rounded-full animate-pulse opacity-30"
            style={{ background: `radial-gradient(circle, ${cfg.color}, transparent 70%)` }}
          />
        )}
        <Avatar
          name={player.username}
          url={player.avatar_url}
          size={isFirst ? 84 : 64}
          ring={`${cfg.color}60`}
        />
        {isFirst && (
          <div
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: cfg.color, boxShadow: `0 0 12px ${cfg.glow}` }}
          >
            <Crown size={11} className="text-black" />
          </div>
        )}
      </div>

      <h3
        className="text-sm font-bold truncate max-w-[130px] z-10 relative"
        style={{ color: "rgba(255,255,255,0.92)" }}
      >
        {player.username}
      </h3>
      <p className="text-[10px] font-semibold mt-0.5 z-10 relative" style={{ color: cfg.color }}>
        {cfg.label}
      </p>
      <p className="text-[10px] mt-0.5 z-10 relative" style={{ color: "rgba(255,255,255,0.3)" }}>
        Level {player.level || 1}
      </p>

      {/* Score pill */}
      <div
        className="mt-5 pt-4 w-full border-t z-10 relative"
        style={{ borderColor: `${cfg.color}18` }}
      >
        <p
          className="text-2xl font-black tabular-nums"
          style={{ color: isFirst ? cfg.color : "rgba(255,255,255,0.88)" }}
        >
          {(player.display_score || player.xp || 0).toLocaleString()}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          {player.score_label || "XP"}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "rgba(255,255,255,0.7)" }} className="font-semibold">{player.wins || 0}</span> wins
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "rgba(255,255,255,0.7)" }} className="font-semibold">{player.kills || 0}</span> kills
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "score",  label: "Points",  icon: Zap       },
  { key: "level",  label: "Level",   icon: TrendingUp },
  { key: "wins",   label: "Wins",    icon: Trophy    },
  { key: "coins",  label: "Coins",   icon: Star      },
];

// ─── Player row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, idx, isMe, sortKey }) {
  const [hovered, setHovered] = useState(false);

  const rankColor =
    player.rank === 1 ? "#f59e0b" :
    player.rank === 2 ? "#94a3b8" :
    player.rank === 3 ? "#f97316" :
    "rgba(255,255,255,0.25)";

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
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(idx * 0.012, 0.28), duration: 0.35, ease: [0.16,1,0.3,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-center gap-3 px-4 py-3.5 border-l-2 transition-all duration-150 relative"
      style={{
        borderLeftColor: isMe ? "#7C3AED" : hovered ? "rgba(255,255,255,0.08)" : "transparent",
        background: isMe
          ? "rgba(124,58,237,0.06)"
          : hovered
          ? "rgba(255,255,255,0.025)"
          : "transparent",
      }}
    >
      {/* Rank number */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {player.rank <= 3 ? (
          <span className="text-[15px] leading-none">
            {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: player.rank <= 10 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)" }}
          >
            {player.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar
        name={player.username}
        url={player.avatar_url}
        size={36}
        ring={player.rank <= 3 ? `${rankColor}50` : undefined}
      />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/profile/${player.id}`}
            className="text-sm font-semibold truncate transition-colors hover:text-violet-300"
            style={{ color: isMe ? "#A78BFA" : "rgba(255,255,255,0.85)" }}
          >
            {player.username}
          </Link>
          {isMe && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              YOU
            </span>
          )}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
          Level {player.level || 1}
          {player.last_seen_at && (
            <span className="ml-2" style={{ color: "rgba(255,255,255,0.18)" }}>
              {timeSince(player.last_seen_at)}
            </span>
          )}
        </p>
      </div>

      {/* Score */}
      <div className="text-right hidden sm:block flex-shrink-0 min-w-[56px]">
        <p
          className="text-sm font-bold tabular-nums transition-colors"
          style={{ color: hovered ? "#f59e0b" : "rgba(255,255,255,0.82)" }}
        >
          {scoreValue}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.22)" }}>
          {scoreLabel}
        </p>
      </div>

      {/* Wins */}
      <div className="text-right hidden md:block flex-shrink-0 w-12">
        <p className="text-sm font-bold tabular-nums" style={{ color: "#34d399" }}>
          {player.wins || 0}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.22)" }}>wins</p>
      </div>

      {/* Coins */}
      <div className="text-right hidden lg:block flex-shrink-0 w-16">
        <p className="text-sm font-bold tabular-nums" style={{ color: "#f59e0b" }}>
          {(player.coins || 0).toLocaleString()}
        </p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.22)" }}>CP</p>
      </div>
    </motion.div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow({ i }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 animate-pulse"
      style={{ animationDelay: `${i * 0.04}s` }}
    >
      <div className="w-8 h-4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="h-3 w-12 rounded hidden sm:block" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-3 w-8 rounded hidden md:block" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
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
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, level, xp, fair_play_score, is_verified, last_seen_at")
          .order("xp", { ascending: false })
          .limit(150);

        if (profErr) throw profErr;
        if (!profiles?.length) { setRawPlayers([]); setLoading(false); return; }

        const profileIds = profiles.map(p => p.id);

        const [statsRes, walletsRes] = await Promise.all([
          supabase.from("player_stats").select("user_id, total_points, kills, wins, tournaments_played").in("user_id", profileIds),
          supabase.from("wallets").select("user_id, balance").in("user_id", profileIds),
        ]);

        let statsMap = {};
        let walletMap = {};
        if (statsRes.data?.length) statsMap = Object.fromEntries(statsRes.data.map(s => [s.user_id, s]));
        if (walletsRes.data?.length) walletMap = Object.fromEntries(walletsRes.data.map(w => [w.user_id, w.balance]));

        const enriched = profiles.map(p => {
          const st = statsMap[p.id] || {};
          const wins   = st.wins  ?? 0;
          const kills  = st.kills ?? 0;
          const xp     = p.xp    ?? 0;
          const coins  = walletMap[p.id] ?? 0;
          const level  = p.level ?? 1;
          const display_score = st.total_points ?? xp;
          const score_label   = st.total_points != null ? "Points" : "XP";
          const score = display_score * 1 + level * 100 + wins * 50;
          return { ...p, wins, kills, xp, coins, level, display_score, score_label, score };
        });

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

  const filtered = useMemo(() =>
    search
      ? sortedPlayers.filter(p => p.username?.toLowerCase().includes(search.toLowerCase()))
      : sortedPlayers,
    [sortedPlayers, search]
  );

  const top3    = !search ? filtered.slice(0, 3) : [];
  const rest    = !search ? filtered.slice(3)    : filtered;
  const myEntry = rawPlayers.find(p => p.id === me?.id);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(10,12,26,0.97) 0%, rgba(15,7,36,0.97) 50%, rgba(10,12,26,0.97) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: 120,
        }}
      >
        {/* Aurora orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -left-8 w-56 h-56 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)", filter: "blur(32px)" }} />
          <div className="absolute -top-4 right-24 w-40 h-40 rounded-full opacity-12"
            style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)", filter: "blur(28px)" }} />
          <div className="absolute bottom-0 right-0 w-48 h-32 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #06B6D4, transparent 70%)", filter: "blur(24px)" }} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={11} style={{ color: "#f59e0b" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#f59e0b" }}>
                Global Rankings
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "rgba(255,255,255,0.94)" }}>
              Hall of{" "}
              <span style={{
                background: "linear-gradient(135deg, #f59e0b, #fbbf24, #f97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Champions
              </span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {loading ? "Loading rankings…" : `${rawPlayers.length} players competing worldwide`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {myEntry && (
              <div
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0"
                style={{
                  background: "rgba(124,58,237,0.1)",
                  borderColor: "rgba(124,58,237,0.25)",
                }}
              >
                <Medal size={12} style={{ color: "#A78BFA" }} />
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Your rank:{" "}
                  <span className="font-bold" style={{ color: "#A78BFA" }}>#{myEntry.rank}</span>
                </span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.25)" }} />
              <input
                type="text"
                placeholder="Search players…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-52 text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.background = "rgba(124,58,237,0.06)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Sort tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
          const active = sortKey === key;
          return (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 border transition-all duration-200"
              style={active
                ? {
                    background: "rgba(124,58,237,0.15)",
                    borderColor: "rgba(124,58,237,0.35)",
                    color: "#A78BFA",
                    boxShadow: "0 0 12px rgba(124,58,237,0.2)",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.38)",
                  }
              }
            >
              <Icon size={11} />
              {label}
              {active && (
                sortDir === "desc"
                  ? <ChevronDown size={10} />
                  : <ChevronUp size={10} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.18)", color: "#f87171" }}
        >
          <AlertCircle size={15} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Podium ── */}
      <AnimatePresence>
        {!loading && !error && !search && top3.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <PodiumCard player={top3[1]} rank={2} />
            <PodiumCard player={top3[0]} rank={1} />
            <PodiumCard player={top3[2]} rank={3} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Rankings Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10,12,26,0.95)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Table header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              {search
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
                : `Top ${rawPlayers.length} players`}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 pr-1">
            {[
              { key: "score", label: rawPlayers[0]?.score_label || "XP" },
              { key: "wins",  label: "Wins" },
              { key: "coins", label: "CP", lg: true },
            ].map(h => (
              <button
                key={h.key}
                onClick={() => handleSort(h.key)}
                className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest w-16 justify-end transition-colors hover:text-white ${h.lg ? "hidden lg:flex" : ""}`}
                style={{ color: sortKey === h.key ? "#A78BFA" : "rgba(255,255,255,0.22)" }}
              >
                {h.label}
                {sortKey === h.key && (sortDir === "desc" ? <ChevronDown size={9} /> : <ChevronUp size={9} />)}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton loading */}
        {loading && (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {[...Array(8)].map((_, i) => <SkeletonRow key={i} i={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Users size={22} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
              {search ? "No players match your search" : "No ranking data available yet"}
            </p>
          </div>
        )}

        {/* Player rows */}
        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
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
