import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useOutletContext, Link } from "react-router-dom";
import { Trophy, Crown, Sword, TrendingUp, Search, ChevronRight, Medal, Star } from "lucide-react";

// ─── PODIUM CARD ──────────────────────────────────────────────────────────────
const PodiumCard = ({ player, rank, delay }) => {
  const cfg = {
    1: { label: "Champion",   accent: "#f59e0b", border: "rgba(245,158,11,0.25)", glow: "rgba(245,158,11,0.12)", size: "w-24 h-24", ring: "#f59e0b" },
    2: { label: "2nd Place",  accent: "#94a3b8", border: "rgba(148,163,184,0.15)", glow: "rgba(148,163,184,0.06)", size: "w-18 h-18", ring: "#94a3b8" },
    3: { label: "3rd Place",  accent: "#f97316", border: "rgba(249,115,22,0.18)", glow: "rgba(249,115,22,0.07)", size: "w-18 h-18", ring: "#f97316" },
  }[rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: rank === 1 ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`cp-card flex flex-col items-center text-center p-6 ${rank === 1 ? "md:-mt-4 md:pb-8" : ""}`}
      style={{ border: `1px solid ${cfg.border}`, background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${cfg.glow}, transparent)` }}
    >
      {/* Rank badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] mb-4"
        style={{ background: cfg.accent, color: "#020617" }}
      >
        {rank === 1 ? <Crown size={16} /> : rank}
      </div>

      {/* Avatar */}
      <div className="relative mb-3">
        {rank === 1 && (
          <div className="absolute -inset-2 rounded-full opacity-30 animate-pulse"
            style={{ background: `radial-gradient(circle, ${cfg.ring}, transparent)` }} />
        )}
        <div
          className={`relative ${rank === 1 ? "w-24 h-24" : "w-16 h-16"} rounded-2xl overflow-hidden border-2 flex items-center justify-center font-black text-2xl`}
          style={{ borderColor: cfg.ring, background: `linear-gradient(135deg, ${cfg.accent}22, rgba(13,18,32,1))` }}
        >
          {player.avatar ? (
            <img src={player.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: cfg.accent }}>{player.username[0]?.toUpperCase()}</span>
          )}
        </div>
      </div>

      <h3 className="text-[12px] font-black text-white uppercase tracking-wide truncate max-w-[120px]">
        {player.username}
      </h3>
      <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ color: cfg.accent }}>
        {cfg.label}
      </p>

      <div className={`mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] w-full grid ${rank === 1 ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
        <div>
          <p className="text-[1.2rem] font-heading font-black" style={{ color: rank === 1 ? cfg.accent : "white" }}>
            {(player.total_points || 0).toLocaleString()}
          </p>
          <p className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest">Points</p>
        </div>
        {rank === 1 && (
          <div>
            <p className="text-[1.2rem] font-heading font-black text-[#10b981]">
              {player.wins || 0}
            </p>
            <p className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest">Wins</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── TABLE ROW ────────────────────────────────────────────────────────────────
const PlayerRow = ({ player, idx, isMe }) => {
  const rankColor = player.rank === 1 ? "#f59e0b" : player.rank === 2 ? "#94a3b8" : player.rank === 3 ? "#f97316" : "rgba(255,255,255,0.3)";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.018, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex items-center gap-4 px-4 py-3 transition-all duration-[220ms] ${
        isMe
          ? "bg-[rgba(99,102,241,0.06)] border-l-2 border-cp-indigo"
          : "hover:bg-[rgba(255,255,255,0.025)] border-l-2 border-transparent"
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {player.rank <= 3 ? (
          <span className="text-[12px] font-heading font-black" style={{ color: rankColor }}>
            {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-[10px] font-black text-[rgba(255,255,255,0.25)] tabular-nums">
            {player.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-black text-[11px]"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.1))", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {player.avatar ? (
          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[rgba(255,255,255,0.5)]">{player.username?.[0]?.toUpperCase()}</span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-black uppercase tracking-wide truncate transition-colors duration-[220ms] ${isMe ? "text-cp-indigo-light" : "text-white group-hover:text-white"}`}>
          {player.username}
          {isMe && <span className="ml-2 text-[8px] text-cp-indigo-light opacity-70">(you)</span>}
        </p>
        <p className="text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mt-0.5">
          Lvl {player.level}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-black text-[rgba(255,255,255,0.8)] tabular-nums group-hover:text-[#f59e0b] transition-colors duration-[220ms]">
            {(player.total_points || 0).toLocaleString()}
          </p>
          <p className="text-[7px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">pts</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[11px] font-black text-[#10b981] tabular-nums">{player.wins || 0}</p>
          <p className="text-[7px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">wins</p>
        </div>
        <div className="text-right hidden lg:block">
          <p className="text-[11px] font-black text-[rgba(255,255,255,0.5)] tabular-nums">{player.kills || 0}</p>
          <p className="text-[7px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">kills</p>
        </div>
        <ChevronRight size={12} className="text-[rgba(255,255,255,0.1)] group-hover:text-[rgba(255,255,255,0.4)] transition-colors duration-[220ms]" />
      </div>
    </motion.div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const { profile: me } = useOutletContext() || {};
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: statsData } = await supabase
          .from("player_stats")
          .select("user_id, total_points, kills, wins, tournaments_played")
          .gt("tournaments_played", 0)
          .order("total_points", { ascending: false })
          .limit(100);

        if (statsData?.length) {
          const ids = statsData.map(s => s.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, level")
            .in("id", ids);
          const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
          setPlayers(statsData.map((s, i) => ({
            ...s,
            rank: i + 1,
            username: pMap[s.user_id]?.username || "Player",
            avatar: pMap[s.user_id]?.avatar_url,
            level: pMap[s.user_id]?.level || 1,
          })));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = players.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );
  const top3 = !search ? filtered.slice(0, 3) : [];
  const rest = !search ? filtered.slice(3) : filtered;
  const myRank = players.find(p => p.user_id === me?.id);

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
            <Trophy size={13} className="text-[#f59e0b]" />
            <span className="text-[9px] font-black text-[rgba(245,158,11,0.7)] uppercase tracking-[0.2em]">
              Global Rankings
            </span>
          </div>
          <h1 className="text-[2rem] md:text-[2.8rem] font-heading font-black text-white uppercase tracking-tighter leading-[0.9]">
            Hall of<br />
            <span style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Champions
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {myRank && (
            <div className="px-4 py-2.5 rounded-2xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] hidden md:flex items-center gap-2">
              <Medal size={13} className="text-cp-indigo" />
              <span className="text-[10px] font-black text-[rgba(255,255,255,0.6)] uppercase tracking-wider">
                Your rank: <span className="text-white">#{myRank.rank}</span>
              </span>
            </div>
          )}

          <div className="relative group max-w-xs w-full md:w-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-[#f59e0b] transition-colors duration-[220ms]" />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cp-input pl-9 w-full md:w-52"
            />
          </div>
        </div>
      </motion.div>

      {/* ── PODIUM ── */}
      {!loading && !search && top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <PodiumCard player={top3[1]} rank={2} delay={0.1} />
          <PodiumCard player={top3[0]} rank={1} delay={0}   />
          <PodiumCard player={top3[2]} rank={3} delay={0.2} />
        </div>
      )}

      {/* ── TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="cp-card overflow-hidden"
      >
        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
          <span className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-[0.2em]">
            {search ? `${filtered.length} results` : `Top ${players.length} Players`}
          </span>
          <div className="hidden md:flex items-center gap-8 pr-5">
            {["Points", "Wins", "Kills"].map(h => (
              <span key={h} className="text-[8px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest w-10 text-right">
                {h}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="cp-skeleton h-14 rounded-xl" style={{ animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        ) : rest.length === 0 && filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-[0.2em]">
              No players found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {rest.map((p, i) => (
              <PlayerRow
                key={p.user_id}
                player={p}
                idx={i}
                isMe={p.user_id === me?.id}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
