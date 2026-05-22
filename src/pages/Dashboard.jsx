import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, Target, TrendingUp, Crown, Sword, Clock,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Wallet, Activity, ShieldCheck, Cpu, Zap, Radio,
  Users2, Gamepad2, Sparkles, Swords,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import StoriesRow from "../social/components/StoriesRow";
import { AnimatedStatCard } from "../components/ui/AnimatedStatCard";
import { useCountUp } from "../hooks/useCountUp";
import { useScrollReveal } from "../hooks/useScrollReveal";

// ── XP Ring ────────────────────────────────────────────────────────────
const XpRing = ({ progress, children, size = 80 }) => {
  const r = 33;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="4" />
        <motion.circle
          cx="38" cy="38" r={r} fill="none"
          stroke="url(#xpGrad)" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.5))" }}
        />
        <defs>
          <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

// ── Tournament row ─────────────────────────────────────────────────────
const TournamentItem = ({ t, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.05 * idx, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    <Link
      to={`/tournaments/${t.id}`}
      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all duration-[220ms]"
    >
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
        {t.banner_url
          ? <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
          : <Swords size={15} className="text-cyber-400/50" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-medium text-white/85 truncate group-hover:text-cyber-400 transition-colors">
            {t.name}
          </p>
          {t.status === "live" && (
            <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/30">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-red-400">Live</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-yellow-400/70 font-medium">
            {(t.prize_coins || 0).toLocaleString()} CP
          </span>
          <span className="text-xs text-white/30">
            {t.current_players ?? 0}/{t.max_players ?? "∞"}
          </span>
        </div>
      </div>
      <ChevronRight size={13} className="flex-shrink-0 text-white/15 group-hover:text-cyber-400 transition-colors" />
    </Link>
  </motion.div>
);

// ── Custom chart tooltip ───────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-cp-s3 border border-cyber-border shadow-lg">
      <p className="text-[10px] font-medium text-white/40 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white">
        {payload[0].value} <span className="text-xs text-cyber-400">pts</span>
      </p>
    </div>
  );
};

// ── Quick action card ──────────────────────────────────────────────────
function QuickCard({ to, icon: Icon, label, accent, delay }) {
  const colors = {
    cyber: { bg: 'bg-cyber-dim', text: 'text-cyber-400', border: 'border-cyber-border' },
    cyan:  { bg: 'bg-cyan-dim',  text: 'text-neon-cyan', border: 'border-cyan-400/20' },
    gold:  { bg: 'bg-gold-dim',  text: 'text-cyber-gold', border: 'border-cyber-gold/20' },
    mint:  { bg: 'bg-mint-glow/10', text: 'text-mint', border: 'border-mint/20' },
  };
  const c = colors[accent] ?? colors.cyber;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={to}
        className="group flex flex-col items-center gap-3 py-5 px-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all duration-[220ms] text-center"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.bg} ${c.border} group-hover:scale-110 transition-transform duration-[220ms]`}>
          <Icon size={17} className={c.text} />
        </div>
        <span className="text-xs font-medium text-white/45 group-hover:text-white transition-colors">
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────
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

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="orb-cyber w-[600px] h-[600px] -top-40 -left-40 opacity-60" />
        <div className="orb-cyan  w-[400px] h-[400px] bottom-0 right-0 opacity-50" />
        <div className="orb-gold  w-[300px] h-[300px] top-1/2 right-1/4 opacity-30" />
      </div>

      <div className="relative z-10 space-y-6 pb-10">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="cp-live-dot" />
              <span className="text-xs font-medium text-mint/80">Active Session</span>
              {season && (
                <>
                  <span className="w-px h-3 bg-white/10" />
                  <span className="text-xs text-white/35">{season.name}</span>
                </>
              )}
            </div>
            <h1 className="font-heading text-[clamp(26px,5vw,44px)] font-bold text-white tracking-tight leading-[1.05]">
              Command <span className="text-cyber">Center</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gold-dim border border-cyber-gold/20">
              <Wallet size={13} className="text-cyber-gold" />
              <span className="text-xs font-semibold text-cyber-gold">{balance.toLocaleString()} CP</span>
            </div>
            <Link to="/tournaments" className="cyber-btn cyber-btn-primary cyber-btn-sm">
              <Swords size={12} />
              Enter Arena
            </Link>
          </div>
        </motion.div>

        {/* ── Stories ── */}
        <div className="overflow-visible">
          <StoriesRow profile={profile} />
        </div>

        {/* ── Stat cards strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AnimatedStatCard icon={<Wallet size={18} />}     label="Balance"   value={balance}             suffix=" CP"      accent="gold"  />
          <AnimatedStatCard icon={<Trophy size={18} />}     label="Rank"      value={stats?.rank ?? 0}    prefix="#"        accent="cyber" />
          <AnimatedStatCard icon={<TrendingUp size={18} />} label="Win Rate"  value={winRate}             suffix="%"        accent="cyan"  format="compact" />
          <AnimatedStatCard icon={<Flame size={18} />}      label="Streak"    value={stats?.streak ?? 0}  suffix="d"        accent="gold"  />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT — profile + tournaments */}
          <div className="lg:col-span-4 space-y-4">

            {/* Profile card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="luxury-card overflow-hidden"
            >
              {/* Header gradient */}
              <div className="h-20 relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(6,182,212,0.10) 100%)' }}
                />
                <div className="absolute inset-0 cyber-grid opacity-40" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#07091a] to-transparent" />
              </div>

              <div className="px-5 pb-5 -mt-10">
                <div className="flex items-end gap-4 mb-4">
                  <XpRing progress={xpProgress} size={80}>
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-cp-s1 flex items-center justify-center text-white font-black text-xl"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
                    >
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : profile?.username?.[0]?.toUpperCase() || "P"
                      }
                    </div>
                  </XpRing>

                  <div className="flex-1 pb-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {profile?.username || "Operative"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-mint/70">
                        Level {profile?.level || 1}
                      </span>
                      <ShieldCheck size={10} className="text-cyber-400/60" />
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] font-medium text-white/30 mb-1">
                        <span>XP</span>
                        <span>{profile?.xp || 0} / 1000</span>
                      </div>
                      <div className="cp-progress">
                        <motion.div
                          className="cp-progress-fill"
                          style={{ background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Matches", value: stats?.tournaments_played ?? 0 },
                    { label: "Wins",    value: stats?.wins ?? 0 },
                    { label: "Win%",    value: `${winRate}%` },
                  ].map(s => (
                    <div key={s.label} className="text-center py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <p className="text-base font-bold text-white leading-none">{s.value}</p>
                      <p className="text-[10px] text-white/35 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Link to="/profile" className="cyber-btn cyber-btn-ghost w-full justify-center">
                  View Profile <ArrowUpRight size={11} className="ml-1" />
                </Link>
              </div>
            </motion.div>

            {/* Active tournaments */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="luxury-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Swords size={13} className="text-cyber-400" />
                  <span className="text-sm font-medium text-white/55">Active Operations</span>
                </div>
                <Link to="/tournaments" className="text-xs text-cyber-400/60 hover:text-cyber-400 transition-colors">
                  View all →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="cp-skeleton h-14 rounded-xl" />)}
                </div>
              ) : tournaments.length > 0 ? (
                <div className="space-y-0.5">
                  {tournaments.map((t, i) => <TournamentItem key={t.id} t={t} idx={i} />)}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Radio size={22} className="text-white/10 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-white/30">No active operations</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT — hero banner + chart + quick access */}
          <div className="lg:col-span-8 space-y-4">

            {/* Hero banner */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="command-panel h-[200px] md:h-[240px] overflow-hidden"
            >
              {/* Grid background */}
              <div className="absolute inset-0 cyber-grid opacity-50" />

              {/* Ambient orb */}
              <div className="absolute top-1/2 right-8 -translate-y-1/2 w-52 h-52 rounded-full pointer-events-none orb-cyber opacity-60" />

              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-7 h-7 border-l-2 border-t-2 border-cyber-border rounded-tl-lg" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-r-2 border-b-2 border-cyber-border rounded-br-lg" />

              <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyber-dim border border-cyber-border">
                    <Zap size={9} className="text-cyber-400" />
                    <span className="text-[10px] font-medium text-cyber-400">
                      {season ? `Season: ${season.name}` : "CipherPool Arena"}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="font-heading text-[clamp(22px,3.5vw,36px)] font-bold text-white tracking-tight leading-[1.1] mb-4">
                    Deploy Your <span className="text-cyber">Squad Now</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to="/tournaments" className="cyber-btn cyber-btn-primary cyber-btn-sm">
                      Browse Tournaments <ChevronRight size={11} className="ml-0.5" />
                    </Link>
                    <Link to="/leaderboard" className="cyber-btn cyber-btn-ghost cyber-btn-sm">
                      Global Rankings
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Performance chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="luxury-card p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-cyber-400" />
                  <span className="text-sm font-medium text-white/55">Performance</span>
                </div>
                <span className="text-xs text-white/25">7-day</span>
              </div>

              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#8B5CF6" stopOpacity={0.30} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="d"
                      axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 500 }}
                      dy={8}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(139,92,246,0.25)", strokeWidth: 1 }} />
                    <Area
                      type="monotone" dataKey="v"
                      stroke="#8B5CF6" strokeWidth={2}
                      fill="url(#cyberGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Quick access grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickCard to="/store"         icon={Sparkles} label="Store"        accent="gold"  delay={0.30} />
              <QuickCard to="/daily-rewards" icon={Star}     label="Rewards"      accent="mint"  delay={0.35} />
              <QuickCard to="/achievements"  icon={Medal}    label="Achievements"  accent="cyber" delay={0.40} />
              <QuickCard to="/leaderboard"   icon={Crown}    label="Rankings"     accent="cyan"  delay={0.45} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
