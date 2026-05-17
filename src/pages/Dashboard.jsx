import { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import {
  Trophy, Target, TrendingUp, Crown, Sword, Clock,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Wallet, Activity, ShieldCheck, Cpu, Zap, Radio,
  BarChart, Users2, Gamepad2, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import StoriesRow from "../social/components/StoriesRow";

// ─── AMBIENT ORB ────────────────────────────────────────────────────────────
const Orb = ({ color, size, x, y, blur }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      width: size, height: size, top: y, left: x,
      background: color, borderRadius: "50%",
      filter: `blur(${blur || 80}px)`, opacity: 0.18,
    }}
  />
);

// ─── STAT CARD ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    className="cp-card relative overflow-hidden group"
  >
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}0d, transparent)` }}
    />
    <div className="relative z-10 p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[rgba(255,255,255,0.18)]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[2rem] font-heading font-black text-white leading-none tracking-tighter">
          {value}
        </span>
        {sub && (
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: accent }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

// ─── TOURNAMENT ITEM ─────────────────────────────────────────────────────────
const TournamentItem = ({ t, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.05 * idx, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    <Link to={`/tournaments/${t.id}`} className="group/row flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-all duration-[220ms]">
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
        {t.banner_url ? (
          <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Sword size={16} className="text-[rgba(99,102,241,0.6)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[11px] font-black text-white uppercase tracking-wide truncate group-hover/row:text-cp-indigo transition-colors duration-[220ms]">
            {t.name}
          </p>
          {t.status === "live" && (
            <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/30">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[7px] font-black text-red-400 uppercase">Live</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-[rgba(245,158,11,0.7)] uppercase tracking-wider">
            {(t.prize_coins || 0).toLocaleString()} CP
          </span>
          <span className="text-[9px] text-[rgba(255,255,255,0.3)] uppercase">
            {t.current_players ?? 0}/{t.max_players ?? "∞"}
          </span>
        </div>
      </div>
      <ChevronRight size={13} className="flex-shrink-0 text-[rgba(255,255,255,0.15)] group-hover/row:text-cp-indigo transition-colors duration-[220ms]" />
    </Link>
  </motion.div>
);

// ─── XP RING ─────────────────────────────────────────────────────────────────
const XpRing = ({ progress, children, size = 140 }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none"
          stroke="#6366f1" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-[#0d1220] border border-[rgba(99,102,241,0.3)] shadow-lg">
      <p className="text-[8px] font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[13px] font-black text-white">{payload[0].value} <span className="text-[9px] text-cp-indigo">pts</span></p>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [stats, setStats] = useState(null);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [tourRes, statsRes, seasonRes] = await Promise.all([
        supabase.from("tournaments").select("*").in("status", ["registration_open", "published", "live"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle(),
        supabase.from("seasons").select("*").eq("status", "active").maybeSingle(),
      ]);
      setTournaments(tourRes.data || []);
      setStats(statsRes.data || null);
      setSeason(seasonRes.data || null);
      setLoading(false);
    })();
  }, [profile?.id]);

  const winRate = stats?.tournaments_played > 0
    ? Math.round((stats.wins / stats.tournaments_played) * 100)
    : 0;
  const xpProgress = Math.min(((profile?.xp || 0) / 1000) * 100, 100);
  const balance = profile?.balance ?? 0;

  const chartData = [
    { d: "MON", v: 420 }, { d: "TUE", v: 750 }, { d: "WED", v: 580 },
    { d: "THU", v: 1300 }, { d: "FRI", v: 950 }, { d: "SAT", v: 1800 }, { d: "SUN", v: 2400 },
  ];

  return (
    <div className="relative min-h-screen">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <Orb color="#6366f1" size="50vw" x="-15%" y="-20%" blur={120} />
        <Orb color="#10b981" size="35vw" x="70%" y="55%" blur={100} />
        <Orb color="#f59e0b" size="25vw" x="40%" y="80%" blur={90} />
      </div>

      <div className="relative z-10 space-y-7 pb-8">

        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="cp-live-dot" />
              <span className="text-[9px] font-black text-[rgba(16,185,129,0.8)] uppercase tracking-[0.25em]">
                Active Session
              </span>
              {season && (
                <>
                  <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
                  <span className="text-[9px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em]">
                    {season.name}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-[2.2rem] md:text-[3.5rem] font-heading font-black text-white uppercase tracking-tighter leading-[0.9]">
              Command<br />
              <span style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Center
              </span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="px-4 py-2.5 rounded-2xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.18)] flex items-center gap-2">
              <Wallet size={13} className="text-[#f59e0b]" />
              <span className="text-[11px] font-black text-[#f59e0b] uppercase tracking-widest">
                {balance.toLocaleString()} CP
              </span>
            </div>
            <Link
              to="/tournaments"
              className="cp-btn cp-btn-indigo text-[10px] px-4 py-2.5"
            >
              Enter Arena
            </Link>
          </div>
        </motion.div>

        {/* ── STORIES ── */}
        <div className="overflow-visible">
          <StoriesRow profile={profile} />
        </div>

        {/* ── TOP STATS STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Wallet}   label="Balance"      value={balance.toLocaleString()} sub="CP"      accent="#f59e0b" delay={0}    />
          <StatCard icon={Trophy}   label="Rank"         value={stats?.rank ? `#${stats.rank}` : "—"}   accent="#6366f1" delay={0.06} />
          <StatCard icon={TrendingUp} label="Win Rate"   value={`${winRate}%`}                           accent="#10b981" delay={0.12} />
          <StatCard icon={Flame}    label="Streak"       value={`${stats?.streak ?? 0}d`} sub="Active"  accent="#f59e0b" delay={0.18} />
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT — Profile + Tournaments */}
          <div className="lg:col-span-4 space-y-4">

            {/* PROFILE CARD */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="cp-card overflow-hidden"
            >
              {/* header gradient */}
              <div
                className="h-20 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.08) 100%)" }}
              >
                <div className="absolute inset-0 cp-noise opacity-30" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d1220] to-transparent" />
              </div>

              <div className="px-5 pb-5 -mt-8">
                <div className="flex items-end gap-4 mb-4">
                  <XpRing progress={xpProgress} size={80}>
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#0d1220] flex items-center justify-center text-white font-black text-xl"
                      style={{ background: "linear-gradient(135deg, #6366f1, #10b981)" }}
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        profile?.username?.[0]?.toUpperCase() || "P"
                      )}
                    </div>
                  </XpRing>

                  <div className="flex-1 pb-1">
                    <h3 className="text-[13px] font-black text-white uppercase tracking-wide truncate">
                      {profile?.username || "Operative"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-[rgba(16,185,129,0.7)] uppercase tracking-wider">
                        Level {profile?.level || 1}
                      </span>
                      <ShieldCheck size={10} className="text-[rgba(99,102,241,0.6)]" />
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mb-1">
                        <span>XP</span>
                        <span>{profile?.xp || 0} / 1000</span>
                      </div>
                      <div className="cp-progress">
                        <motion.div
                          className="cp-progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* mini stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Matches", value: stats?.tournaments_played ?? 0 },
                    { label: "Wins", value: stats?.wins ?? 0 },
                    { label: "Win%", value: `${winRate}%` },
                  ].map(s => (
                    <div key={s.label} className="text-center py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                      <p className="text-[14px] font-black text-white leading-none">{s.value}</p>
                      <p className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/profile"
                  className="cp-btn cp-btn-ghost w-full justify-center text-[10px]"
                >
                  View Profile <ArrowUpRight size={11} className="ml-1" />
                </Link>
              </div>
            </motion.div>

            {/* ACTIVE TOURNAMENTS */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="cp-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sword size={13} className="text-cp-indigo" />
                  <span className="text-[10px] font-black text-[rgba(255,255,255,0.6)] uppercase tracking-[0.15em]">
                    Active Operations
                  </span>
                </div>
                <Link to="/tournaments" className="text-[9px] font-black text-[rgba(99,102,241,0.6)] hover:text-cp-indigo uppercase tracking-widest transition-colors duration-[220ms]">
                  All →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="cp-skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : tournaments.length > 0 ? (
                <div className="space-y-0.5">
                  {tournaments.map((t, i) => (
                    <TournamentItem key={t.id} t={t} idx={i} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Radio size={24} className="text-[rgba(255,255,255,0.1)] mx-auto mb-2 animate-pulse" />
                  <p className="text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">
                    No active operations
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT — Chart + Season + Quick Links */}
          <div className="lg:col-span-8 space-y-4">

            {/* HERO BANNER — season or CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[20px] h-[200px] md:h-[260px] border border-[rgba(255,255,255,0.05)] group"
              style={{ background: "linear-gradient(135deg, #07091a 0%, #0d1220 50%, #0a0f1e 100%)" }}
            >
              {/* animated grid lines */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Corner brackets */}
              <div className="absolute top-5 left-5 w-8 h-8 border-l-2 border-t-2 border-[rgba(99,102,241,0.3)] rounded-tl-lg pointer-events-none" />
              <div className="absolute bottom-5 right-5 w-8 h-8 border-r-2 border-b-2 border-[rgba(99,102,241,0.3)] rounded-br-lg pointer-events-none" />

              {/* Glow orb */}
              <div className="absolute top-1/2 right-12 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
              />

              <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.25)] flex items-center gap-1.5">
                    <Zap size={9} className="text-cp-indigo" />
                    <span className="text-[8px] font-black text-[#818cf8] uppercase tracking-[0.2em]">
                      {season ? `Season: ${season.name}` : "CipherPool Arena"}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-[1.8rem] md:text-[2.8rem] font-heading font-black text-white uppercase tracking-tighter leading-[0.9] mb-4">
                    Deploy Your<br />
                    <span style={{ background: "linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Squad Now
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to="/tournaments" className="cp-btn cp-btn-indigo text-[10px] px-5 py-2.5">
                      Browse Tournaments <ChevronRight size={11} className="ml-0.5" />
                    </Link>
                    <Link to="/leaderboard" className="cp-btn cp-btn-ghost text-[10px] px-5 py-2.5">
                      Global Rankings
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* PERFORMANCE CHART */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="cp-card p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-cp-indigo" />
                  <span className="text-[10px] font-black text-[rgba(255,255,255,0.6)] uppercase tracking-[0.15em]">
                    Performance
                  </span>
                </div>
                <span className="text-[8px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">7-day</span>
              </div>

              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="d"
                      axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em" }}
                      dy={8}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(99,102,241,0.2)", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#cpGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* QUICK ACCESS GRID */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {[
                { to: "/store",         icon: Sparkles, label: "Store",       accent: "#f59e0b" },
                { to: "/daily-rewards", icon: Star,     label: "Rewards",     accent: "#10b981" },
                { to: "/achievements",  icon: Medal,    label: "Achievements", accent: "#a78bfa" },
                { to: "/leaderboard",   icon: Crown,    label: "Rankings",    accent: "#6366f1" },
              ].map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={item.to}
                    className="group flex flex-col items-center gap-2.5 py-5 px-3 rounded-[16px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:border-opacity-30 hover:bg-[rgba(255,255,255,0.05)] transition-all duration-[220ms] text-center"
                    style={{ "--hover-border": item.accent }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-[220ms] group-hover:scale-110"
                      style={{ background: `${item.accent}1a`, border: `1px solid ${item.accent}33` }}
                    >
                      <item.icon size={18} style={{ color: item.accent }} />
                    </div>
                    <span className="text-[9px] font-black text-[rgba(255,255,255,0.4)] group-hover:text-white uppercase tracking-wider transition-colors duration-[220ms]">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
