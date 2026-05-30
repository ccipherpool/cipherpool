import { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  Trophy, TrendingUp, Wallet, Crown, Swords,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Activity, Sparkles, Radio, Target, Zap, Shield,
  Users, BarChart3, Gift, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import StoriesRow from "../social/components/StoriesRow";

/* ── Animated number counter ─────────────────────────────────────────── */
function AnimatedNum({ value, duration = 1.2 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(0);
  const startTime = useRef(null);
  useEffect(() => {
    const target = Number(value) || 0;
    const from   = start.current;
    startTime.current = null;
    const step = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const progress = Math.min((ts - startTime.current) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * ease));
      if (progress < 1) requestAnimationFrame(step);
      else start.current = target;
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return display;
}

/* ── Stat card — 2026 Pro ────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, suffix = "", prefix = "", color, delay, sub }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative rounded-2xl overflow-hidden transition-all duration-300 cursor-default select-none"
      style={{
        background: "var(--cp-surface-2)",
        border: `1px solid ${hov ? color + "40" : "var(--cp-border)"}`,
        boxShadow: hov ? `0 8px 32px ${color}18, 0 0 0 1px ${color}20` : "none",
        padding: "18px",
      }}
    >
      {/* Glow orb */}
      <div
        className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
        style={{ background: color, opacity: hov ? 0.12 : 0.06 }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          {sub && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
              {sub}
            </span>
          )}
        </div>
        <p className="text-2xl font-black leading-none mb-1.5 tabular-nums" style={{ color: "var(--cp-text-1)" }}>
          {prefix}<AnimatedNum value={typeof value === "number" ? value : 0} />{suffix}
        </p>
        <p className="text-xs font-medium" style={{ color: "var(--cp-text-4)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ── Tournament row ─────────────────────────────────────────────────── */
function TournamentItem({ t, idx }) {
  const isLive = t.status === "live";
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * idx, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/tournaments/${t.id}`}
        className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
        style={{ background: "transparent" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center relative"
          style={{ background: "var(--cp-surface-3)", border: `1px solid ${isLive ? "rgba(239,68,68,.35)" : "var(--cp-border)"}` }}
        >
          {t.banner_url
            ? <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
            : <Swords size={14} style={{ color: "var(--cp-text-4)" }} />
          }
          {isLive && <div className="absolute inset-0 bg-red-500/10 animate-pulse" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold truncate transition-colors group-hover:text-violet-400" style={{ color: "var(--cp-text-1)" }}>
              {t.name}
            </p>
            {isLive && (
              <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold text-red-400 tracking-wide">LIVE</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold" style={{ color: "var(--cp-gold)" }}>
              {(t.prize_coins || 0).toLocaleString()} CP
            </span>
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--cp-text-4)" }}>
              <Users size={10} />
              {t.current_players ?? 0}/{t.max_players ?? "∞"}
            </span>
          </div>
        </div>
        <ChevronRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" style={{ color: "var(--cp-accent)" }} />
      </Link>
    </motion.div>
  );
}

/* ── Chart tooltip ──────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl border text-sm backdrop-blur-md" style={{ background: "var(--cp-surface-4)", borderColor: "var(--cp-border-hover)" }}>
      <p className="text-[10px] mb-0.5" style={{ color: "var(--cp-text-4)" }}>{label}</p>
      <p className="font-bold" style={{ color: "var(--cp-text-1)" }}>
        {payload[0].value} <span className="text-xs font-normal" style={{ color: "var(--cp-accent)" }}>pts</span>
      </p>
    </div>
  );
};

/* ── Quick action card ──────────────────────────────────────────────── */
function QuickCard({ to, icon: Icon, label, color, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Link
        to={to}
        className="group flex flex-col items-center gap-3 py-5 px-3 rounded-2xl border transition-all duration-200 text-center"
        style={{
          background: hov ? `${color}08` : "var(--cp-surface-2)",
          borderColor: hov ? `${color}45` : "var(--cp-border)",
          transform: hov ? "translateY(-2px)" : "none",
          boxShadow: hov ? `0 8px 24px ${color}15` : "none",
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: hov ? color : "var(--cp-text-3)" }}>
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

/* ── Season ring ────────────────────────────────────────────────────── */
function SeasonRing({ xp = 0, level = 1 }) {
  const max  = 1000;
  const pct  = Math.min((xp / max) * 100, 100);
  const r    = 38;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 92, height: 92 }}>
      <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <motion.circle
          cx="46" cy="46" r={r} fill="none"
          stroke="url(#xpGrad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        />
        <defs>
          <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 text-center">
        <p className="text-lg font-black leading-none" style={{ color: "var(--cp-text-1)" }}>{level}</p>
        <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--cp-text-4)" }}>LEVEL</p>
      </div>
    </div>
  );
}

/* ── MAIN DASHBOARD ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [season,      setSeason]      = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    (async () => {
      const [tourRes, statsRes, seasonRes] = await Promise.all([
        supabase.from("tournaments").select("id, name, status, banner_url, prize_coins, max_players, current_players, start_date").in("status", ["registration_open", "published", "live"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("player_stats").select("wins, tournaments_played, kills, kd_ratio, best_position, total_points").eq("user_id", profile.id).maybeSingle(),
        supabase.from("seasons").select("id, name, status, end_date").eq("status", "active").maybeSingle(),
      ]);
      setTournaments(tourRes.data || []);
      setStats(statsRes.data || null);
      setSeason(seasonRes.data || null);
      setLoading(false);
    })();
  }, [profile?.id]);

  const winRate    = stats?.tournaments_played > 0 ? Math.round((stats.wins / stats.tournaments_played) * 100) : 0;
  const xpProgress = Math.min(((profile?.xp || 0) / 1000) * 100, 100);
  const balance    = profile?.coins ?? profile?.balance ?? 0;
  const level      = profile?.level ?? 1;

  const chartData = [
    { d: "Mon", v: 420 }, { d: "Tue", v: 750 }, { d: "Wed", v: 580 },
    { d: "Thu", v: 1300 }, { d: "Fri", v: 950 }, { d: "Sat", v: 1800 }, { d: "Sun", v: 2400 },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const liveCount = tournaments.filter(t => t.status === "live").length;

  return (
    <div className="cp-dashboard-cinema pb-12" style={{ gap: 0 }}>

      {/* ── HERO BANNER ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="cp-hero-cinema relative overflow-hidden rounded-3xl mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(8,10,28,0.96), rgba(15,8,48,0.92) 42%, rgba(4,28,48,0.94) 100%)",
          border: "1px solid rgba(122,226,255,0.18)",
          minHeight: 230,
        }}
      >
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glow orbs */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(124,58,237,0.25)" }} />
        <div className="absolute -bottom-12 left-1/3 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(6,182,212,0.18)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: "rgba(245,158,11,0.12)" }} />
        <div className="cp-hero-horizon" />
        <div className="cp-hero-reticle" />

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
              className="cp-command-kicker"
            >
              <span /> Esports Control Room
            </motion.div>
            {/* Season pill */}
            {season && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="flex items-center gap-2 mb-3"
              >
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <Trophy size={10} />
                  {season.name} — ACTIVE
                </span>
                {liveCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {liveCount} LIVE
                  </span>
                )}
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-black tracking-tight leading-tight mb-1"
              style={{ fontSize: "clamp(22px,4vw,36px)", color: "#F8FAFC" }}
            >
              {greeting},{" "}
              <span style={{ background: "linear-gradient(90deg,#A78BFA,#67E8F9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {profile?.username || "Player"}
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Live tournament intelligence, wallet systems, and player progression synced in one command scene.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="cp-hero-actions flex items-center gap-3 flex-shrink-0"
          >
            <Link
              to="/wallet"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold backdrop-blur-md transition-all hover:scale-[1.02]"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <Wallet size={14} />
              {balance.toLocaleString()} CP
            </Link>
            <Link
              to="/tournaments"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
            >
              <Swords size={14} />
              Enter Arena
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ── STORIES ─────────────────────────────────────────────── */}
      <div className="mb-6 overflow-visible">
        <StoriesRow profile={profile} />
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Wallet}     label="Balance"    value={balance}                        suffix=" CP"   color="#F59E0B" delay={0.05} sub={balance > 0 ? "CP" : null} />
        <StatCard icon={Trophy}     label="Global Rank" value={stats?.best_position ?? 0}   prefix="#"     color="#7C3AED" delay={0.10} />
        <StatCard icon={TrendingUp} label="Win Rate"   value={winRate}                       suffix="%"     color="#10B981" delay={0.15} />
        <StatCard icon={Flame}      label="Win Streak" value={stats?.win_streak ?? 0}        suffix="W"     color="#F97316" delay={0.20} sub={stats?.win_streak > 2 ? "HOT" : null} />
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT COLUMN ─────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
          >
            {/* Banner */}
            <div className="h-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1e0a3c 0%,#7C3AED 60%,#06B6D4 100%)" }}>
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl" style={{ background: "rgba(6,182,212,0.4)" }} />
            </div>

            <div className="px-5 pb-5 -mt-10">
              <div className="flex items-end gap-4 mb-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl"
                    style={{
                      background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
                      border: "3px solid var(--cp-surface-2)",
                      boxShadow: "0 4px 24px rgba(0,0,0,.5), 0 0 0 1px rgba(124,58,237,0.3)",
                    }}
                  >
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : profile?.username?.[0]?.toUpperCase() || "P"
                    }
                  </div>
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--cp-surface-2)]" />
                </div>

                <div className="flex-1 pb-1">
                  <h3 className="font-bold truncate text-base" style={{ color: "var(--cp-text-1)" }}>
                    {profile?.username || "Player"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "var(--cp-accent)", border: "1px solid rgba(124,58,237,0.25)" }}>
                      Level {level}
                    </span>
                    {profile?.is_verified && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(6,182,212,0.12)", color: "var(--cp-cyan)", border: "1px solid rgba(6,182,212,0.25)" }}>
                        <Shield size={9} /> Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* XP ring */}
                <SeasonRing xp={profile?.xp || 0} level={level} />
              </div>

              {/* XP bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-semibold mb-1.5" style={{ color: "var(--cp-text-4)" }}>
                  <span>Season XP</span>
                  <span style={{ color: "var(--cp-accent)" }}>{profile?.xp || 0} / 1000</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--cp-surface-3)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                  />
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Matches", value: stats?.tournaments_played ?? 0 },
                  { label: "Wins",    value: stats?.wins ?? 0 },
                  { label: "Win%",    value: `${winRate}%` },
                ].map(s => (
                  <div key={s.label} className="text-center py-3 rounded-xl" style={{ background: "var(--cp-surface-3)", border: "1px solid var(--cp-border)" }}>
                    <p className="text-base font-black leading-none" style={{ color: "var(--cp-text-1)" }}>{s.value}</p>
                    <p className="text-[10px] mt-1 font-medium" style={{ color: "var(--cp-text-4)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/profile"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                style={{ border: "1px solid var(--cp-border)", color: "var(--cp-text-3)" }}
              >
                View Full Profile <ArrowUpRight size={12} />
              </Link>
            </div>
          </motion.div>

          {/* KD / Kills stat mini cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { label: "Total Kills", value: stats?.kills ?? 0, icon: Target, color: "#EF4444" },
              { label: "K/D Ratio",   value: stats?.kd_ratio != null ? Number(stats.kd_ratio).toFixed(2) : "—", icon: BarChart3, color: "#10B981" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <p className="text-xl font-black leading-none mb-1" style={{ color: "var(--cp-text-1)" }}>{value}</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--cp-text-4)" }}>{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Tournaments */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--cp-accent-dim)" }}>
                  <Swords size={12} style={{ color: "var(--cp-accent)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--cp-text-2)" }}>Tournaments</span>
              </div>
              <Link to="/tournaments" className="text-[11px] font-semibold transition-colors hover:text-violet-400" style={{ color: "var(--cp-accent)" }}>
                View all →
              </Link>
            </div>

            <div className="px-1 pb-2">
              {loading ? (
                <div className="space-y-2 px-3 py-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl cp-skeleton" />)}
                </div>
              ) : tournaments.length > 0 ? (
                <div>
                  {tournaments.map((t, i) => <TournamentItem key={t.id} t={t} idx={i} />)}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Radio size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--cp-text-4)" }} />
                  <p className="text-sm" style={{ color: "var(--cp-text-4)" }}>No active tournaments</p>
                  <Link to="/tournaments" className="text-xs mt-1 inline-block hover:underline" style={{ color: "var(--cp-accent)" }}>Browse all →</Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Performance chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-5"
            style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Activity size={14} style={{ color: "var(--cp-accent)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--cp-text-1)" }}>Performance</span>
                </div>
                <p className="text-xs" style={{ color: "var(--cp-text-4)" }}>Weekly XP activity</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "var(--cp-surface-3)", border: "1px solid var(--cp-border)", color: "var(--cp-text-4)" }}>
                  7 days
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="90%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} dy={8} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(124,58,237,0.25)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Stats trio */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Matches Played", value: stats?.tournaments_played ?? 0, icon: Swords,    color: "#7C3AED", suffix: "" },
              { label: "Total Wins",     value: stats?.wins ?? 0,               icon: Trophy,    color: "#F59E0B", suffix: "" },
              { label: "KD Ratio",       value: stats?.kd_ratio != null ? parseFloat(Number(stats.kd_ratio).toFixed(2)) : 0, icon: Target, color: "#10B981", suffix: "" },
            ].map(({ label, value, icon: Icon, color, suffix }) => (
              <div key={label} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none tabular-nums" style={{ color: "var(--cp-text-1)" }}>
                    <AnimatedNum value={value} />{suffix}
                  </p>
                  <p className="text-[11px] font-medium mt-1" style={{ color: "var(--cp-text-4)" }}>{label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Season card */}
          {season && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg,#0e0529,#1a0a45)", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(245,158,11,0.12)" }} />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={14} style={{ color: "var(--cp-gold)" }} />
                    <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "var(--cp-gold)" }}>Active Season</span>
                  </div>
                  <h3 className="text-xl font-black mb-1" style={{ color: "var(--cp-text-1)" }}>{season.name}</h3>
                  {season.end_date && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      <Clock size={10} />
                      Ends {new Date(season.end_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <Link
                  to="/leaderboard"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all hover:brightness-110"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <Crown size={13} /> Rankings
                </Link>
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--cp-text-4)" }}>Quick Access</p>
            <div className="grid grid-cols-4 gap-3">
              <QuickCard to="/store"         icon={Sparkles} label="Store"        color="#F59E0B" delay={0.30} />
              <QuickCard to="/daily-rewards" icon={Gift}     label="Daily Reward" color="#10B981" delay={0.34} />
              <QuickCard to="/achievements"  icon={Medal}    label="Achievements" color="#7C3AED" delay={0.38} />
              <QuickCard to="/leaderboard"   icon={Crown}    label="Rankings"     color="#06B6D4" delay={0.42} />
            </div>
          </motion.div>

          {/* XP / Level progress full card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-5"
            style={{ background: "var(--cp-surface-2)", border: "1px solid var(--cp-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: "var(--cp-cyan)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--cp-text-2)" }}>Season Progress</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--cp-text-4)" }}>
                {profile?.xp || 0} / 1000 XP
              </span>
            </div>

            <div className="h-3 rounded-full overflow-hidden mb-3" style={{ background: "var(--cp-surface-3)" }}>
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }}
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              >
                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,0.08) 8px,rgba(255,255,255,0.08) 16px)" }} />
              </motion.div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map(pct => (
                <div key={pct} className="text-center">
                  <div className={`w-full h-1 rounded-full mb-1.5 ${xpProgress >= pct ? "" : "opacity-25"}`} style={{ background: xpProgress >= pct ? "var(--cp-accent)" : "var(--cp-surface-3)" }} />
                  <p className="text-[10px] font-semibold" style={{ color: xpProgress >= pct ? "var(--cp-text-3)" : "var(--cp-text-4)" }}>{pct}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
