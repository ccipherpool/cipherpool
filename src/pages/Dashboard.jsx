import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, TrendingUp, Wallet, Crown, Swords,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Activity, Sparkles, Users2, Radio,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import StoriesRow from "../social/components/StoriesRow";

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix = "", prefix = "", color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}14` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </p>
      <p className="text-sm text-slate-500">{label}</p>
    </motion.div>
  );
}

// ── Tournament row ─────────────────────────────────────────────────────
function TournamentItem({ t, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * idx, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/tournaments/${t.id}`}
        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
          {t.banner_url
            ? <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
            : <Swords size={14} className="text-slate-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
              {t.name}
            </p>
            {t.status === "live" && (
              <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-red-600">Live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-600 font-medium">
              {(t.prize_coins || 0).toLocaleString()} CP
            </span>
            <span className="text-xs text-slate-400">
              {t.current_players ?? 0}/{t.max_players ?? "∞"} players
            </span>
          </div>
        </div>
        <ChevronRight size={13} className="flex-shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
      </Link>
    </motion.div>
  );
}

// ── Chart tooltip ──────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-lg">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        {payload[0].value} <span className="text-xs text-indigo-500">pts</span>
      </p>
    </div>
  );
};

// ── Quick action ───────────────────────────────────────────────────────
function QuickCard({ to, icon: Icon, label, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={to}
        className="group flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200 shadow-sm hover:shadow-md text-center"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
          style={{ background: `${color}14` }}
        >
          <Icon size={17} style={{ color }} />
        </div>
        <span className="text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
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
    if (!profile?.id) { setLoading(false); return; }
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
    { d: "Mon", v: 420 }, { d: "Tue", v: 750 }, { d: "Wed", v: 580 },
    { d: "Thu", v: 1300 }, { d: "Fri", v: 950 }, { d: "Sat", v: 1800 }, { d: "Sun", v: 2400 },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between gap-4"
      >
        <div>
          {season && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Trophy size={11} />
                {season.name}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {greeting}, <span className="text-indigo-600">{profile?.username || "Player"}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening on CipherPool today.</p>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/wallet"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Wallet size={14} className="text-amber-500" />
            {balance.toLocaleString()} CP
          </Link>
          <Link
            to="/tournaments"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Swords size={13} />
            Enter Arena
          </Link>
        </div>
      </motion.div>

      {/* ── Stories ── */}
      <div className="overflow-visible">
        <StoriesRow profile={profile} />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet}     label="Balance"  value={balance}              suffix=" CP"  color="#f59e0b" delay={0.05} />
        <StatCard icon={Trophy}     label="Rank"     value={stats?.rank ?? 0}     prefix="#"    color="#6366f1" delay={0.10} />
        <StatCard icon={TrendingUp} label="Win Rate" value={winRate}              suffix="%"    color="#10b981" delay={0.15} />
        <StatCard icon={Flame}      label="Streak"   value={stats?.streak ?? 0}   suffix=" days" color="#f97316" delay={0.20} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT — profile + tournaments */}
        <div className="lg:col-span-4 space-y-4">

          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
          >
            {/* Banner gradient */}
            <div
              className="h-16 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)" }}
            >
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
            </div>

            <div className="px-5 pb-5 -mt-8">
              <div className="flex items-end gap-4 mb-4">
                {/* Avatar with XP progress ring */}
                <div className="relative flex-shrink-0">
                  <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90 absolute inset-0">
                    <circle cx="36" cy="36" r="32" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <motion.circle
                      cx="36" cy="36" r="32" fill="none"
                      stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 32}
                      initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - xpProgress / 100) }}
                      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    />
                  </svg>
                  <div
                    className="w-[72px] h-[72px] rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-xl border-2 border-white shadow-lg"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                  >
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : profile?.username?.[0]?.toUpperCase() || "P"
                    }
                  </div>
                </div>

                <div className="flex-1 pb-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {profile?.username || "Player"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-indigo-600 font-medium">Level {profile?.level || 1}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                      <span>XP Progress</span>
                      <span>{profile?.xp || 0} / 1000</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
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
                  <div key={s.label} className="text-center py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-base font-bold text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/profile"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                View Profile <ArrowUpRight size={12} />
              </Link>
            </div>
          </motion.div>

          {/* Active tournaments */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords size={13} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">Active Tournaments</span>
              </div>
              <Link to="/tournaments" className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : tournaments.length > 0 ? (
              <div className="space-y-0.5">
                {tournaments.map((t, i) => <TournamentItem key={t.id} t={t} idx={i} />)}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Radio size={22} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No active tournaments</p>
                <Link to="/tournaments" className="text-xs text-indigo-500 mt-1 inline-block hover:underline">
                  Browse all →
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT — hero + chart + quick access */}
        <div className="lg:col-span-8 space-y-4">

          {/* Hero CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl h-[200px] md:h-[220px]"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1d4ed8 50%, #0891b2 100%)" }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
            />
            {/* Gradient orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-2xl" />

            <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between">
              {season && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white/90 border border-white/15 backdrop-blur-sm">
                    <Trophy size={10} />
                    {season.name}
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight mb-4">
                  Deploy Your Squad. <br />
                  <span className="text-cyan-300">Dominate the Arena.</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/tournaments"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    Browse Tournaments <ChevronRight size={13} />
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/15 transition-colors backdrop-blur-sm"
                  >
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
            transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">Performance</span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">7-day view</span>
            </div>

            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="d"
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                  dy={8}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(79,70,229,0.2)", strokeWidth: 1 }} />
                <Area
                  type="monotone" dataKey="v"
                  stroke="#4f46e5" strokeWidth={2}
                  fill="url(#indigoGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Quick access */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickCard to="/store"         icon={Sparkles} label="Store"        color="#f59e0b" delay={0.30} />
            <QuickCard to="/daily-rewards" icon={Star}     label="Daily Rewards" color="#10b981" delay={0.35} />
            <QuickCard to="/achievements"  icon={Medal}    label="Achievements"  color="#6366f1" delay={0.40} />
            <QuickCard to="/leaderboard"   icon={Crown}    label="Rankings"      color="#06b6d4" delay={0.45} />
          </div>
        </div>
      </div>
    </div>
  );
}
