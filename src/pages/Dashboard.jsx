import { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, TrendingUp, Wallet, Crown, Swords,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Activity, Sparkles, Radio, Target, Zap, Shield,
  Users, BarChart3, Gift, Clock, Play,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import StoriesRow from "../social/components/StoriesRow";

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedNum({ value, duration = 1.2 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef(null);
  useEffect(() => {
    const target = Number(value) || 0;
    const from = startRef.current;
    startTimeRef.current = null;
    const step = (ts) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const progress = Math.min((ts - startTimeRef.current) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * ease));
      if (progress < 1) requestAnimationFrame(step);
      else startRef.current = target;
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return display;
}

// ─── BENTO STAT CARD ──────────────────────────────────────────────────────────
function BentoStat({ icon: Icon, label, value, suffix = "", prefix = "", color, delay, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: 16, padding: "18px", overflow: "hidden",
        background: hov ? `rgba(14,16,32,0.95)` : "rgba(12,14,28,0.9)",
        border: `1px solid ${hov ? color + "40" : "rgba(255,255,255,0.07)"}`,
        boxShadow: hov ? `0 8px 32px ${color}18, 0 0 0 1px ${color}18` : "none",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        cursor: "default",
      }}
    >
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, ${color}80, transparent 60%)`, opacity: hov ? 1 : 0.6, transition: "opacity 0.25s" }} />
      {/* Glow orb */}
      <div style={{ position: "absolute", top: -24, right: -24, width: 80, height: 80, borderRadius: "50%", background: color, filter: "blur(40px)", opacity: hov ? 0.14 : 0.07, transition: "opacity 0.25s", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}14`, border: `1px solid ${color}22` }}>
            <Icon size={15} style={{ color }} />
          </div>
          {badge && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}25`, letterSpacing: 0.5 }}>
              {badge}
            </span>
          )}
        </div>
        <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: "#f8fafc", marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
          {prefix}<AnimatedNum value={typeof value === "number" ? value : 0} />{suffix}
        </p>
        <p style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

// ─── TOURNAMENT ITEM ──────────────────────────────────────────────────────────
function TournamentItem({ t, idx }) {
  const isLive = t.status === "live";
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * idx, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/tournaments/${t.id}`}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, textDecoration: "none", transition: "background 0.18s", background: "transparent" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.05)", border: `1px solid ${isLive ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`,
          position: "relative",
        }}>
          {t.banner_url ? <img src={t.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Swords size={14} style={{ color: "rgba(255,255,255,0.3)" }} />}
          {isLive && <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.1)", animation: "pulse 2s infinite" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.name}
            </p>
            {isLive && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 6px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", flexShrink: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", letterSpacing: 0.5 }}>LIVE</span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
              {(t.prize_coins || 0).toLocaleString()} CP
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              <Users size={9} />
              {t.current_players ?? 0}/{t.max_players ?? "∞"}
            </span>
          </div>
        </div>
        <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, transition: "color 0.2s" }} />
      </Link>
    </motion.div>
  );
}

// ─── CHART TOOLTIP ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(20,22,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", fontSize: 12 }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{label}</p>
      <p style={{ fontWeight: 700, color: "#f8fafc" }}>{payload[0].value} <span style={{ color: "#7C3AED", fontWeight: 500 }}>pts</span></p>
    </div>
  );
};

// ─── QUICK ACTION ─────────────────────────────────────────────────────────────
function QuickAction({ to, icon: Icon, label, color, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Link
        to={to}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          padding: "16px 8px", borderRadius: 16, textDecoration: "none", textAlign: "center",
          background: hov ? `${color}0a` : "rgba(12,14,28,0.8)",
          border: `1px solid ${hov ? color + "38" : "rgba(255,255,255,0.07)"}`,
          transform: hov ? "translateY(-2px)" : "none",
          boxShadow: hov ? `0 8px 24px ${color}12` : "none",
          transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}15`, border: `1px solid ${color}22`,
          transform: hov ? "scale(1.1)" : "scale(1)", transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <Icon size={17} style={{ color }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: hov ? color : "rgba(255,255,255,0.4)", transition: "color 0.2s" }}>
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

// ─── XP RING ─────────────────────────────────────────────────────────────────
function XpRing({ xp = 0, level = 1, size = 80 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((xp % 1000) / 1000, 1);
  const offset = circ - circ * pct;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <defs>
          <linearGradient id="xpGradDash" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#xpGradDash)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.6))" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{level}</p>
        <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>LVL</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
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
        supabase.from("player_stats").select("wins, tournaments_played, kills, kd_ratio, best_position, total_points, win_streak").eq("user_id", profile.id).maybeSingle(),
        supabase.from("seasons").select("id, name, status, end_date").eq("status", "active").maybeSingle(),
      ]);
      setTournaments(tourRes.data || []);
      setStats(statsRes.data || null);
      setSeason(seasonRes.data || null);
      setLoading(false);
    })();
  }, [profile?.id]);

  const winRate    = stats?.tournaments_played > 0 ? Math.round((stats.wins / stats.tournaments_played) * 100) : 0;
  const xpProgress = Math.min(((profile?.xp || 0) % 1000) / 1000 * 100, 100);
  const balance    = profile?.coins ?? profile?.balance ?? 0;
  const level      = profile?.level ?? 1;
  const liveCount  = tournaments.filter(t => t.status === "live").length;

  const chartData = [
    { d: "Mon", v: 420 }, { d: "Tue", v: 750 }, { d: "Wed", v: 580 },
    { d: "Thu", v: 1300 }, { d: "Fri", v: 950 }, { d: "Sat", v: 1800 }, { d: "Sun", v: 2400 },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const STATS = [
    { icon: Wallet,     label: "Balance",    value: balance,                                  suffix: " CP",   color: "#f59e0b", delay: 0.04, badge: balance > 0 ? "CP" : null },
    { icon: Trophy,     label: "Best Rank",  value: stats?.best_position ?? 0,                prefix: "#",     color: "#7C3AED", delay: 0.08 },
    { icon: TrendingUp, label: "Win Rate",   value: winRate,                                  suffix: "%",     color: "#10b981", delay: 0.12 },
    { icon: Flame,      label: "Win Streak", value: stats?.win_streak ?? 0,                  suffix: "W",     color: "#f97316", delay: 0.16, badge: (stats?.win_streak ?? 0) > 2 ? "HOT" : null },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 48 }}>

      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 200,
          background: "linear-gradient(135deg, rgba(8,6,24,0.98) 0%, rgba(20,8,52,0.96) 45%, rgba(4,20,44,0.97) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Aurora orbs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(124,58,237,0.22)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "30%", width: 240, height: 240, borderRadius: "50%", background: "rgba(6,182,212,0.15)", filter: "blur(70px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", right: "20%", width: 160, height: 160, borderRadius: "50%", background: "rgba(245,158,11,0.1)", filter: "blur(60px)", pointerEvents: "none" }} />
        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Horizon line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(6,182,212,0.4), transparent)" }} />

        <div style={{ position: "relative", zIndex: 1, padding: "28px 32px", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            {/* Season + live badge row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {season && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.14)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.28)", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>
                  <Trophy size={9} /> {season.name} · ACTIVE
                </span>
              )}
              {liveCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.14)", color: "#f87171", border: "1px solid rgba(239,68,68,0.28)", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                  {liveCount} LIVE
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              {greeting},{" "}
              <span style={{ background: "linear-gradient(90deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {profile?.username || "Player"}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>
              Live tournament intelligence · Player progression · Wallet systems
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link
              to="/wallet"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 12, textDecoration: "none", background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.28)", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.12)"; }}
            >
              <Wallet size={14} /> {balance.toLocaleString()} CP
            </Link>
            <Link
              to="/tournaments"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 12, textDecoration: "none", background: "linear-gradient(135deg, #7C3AED, #4f46e5)", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(124,58,237,0.4)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
            >
              <Swords size={14} /> Enter Arena
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── STORIES ── */}
      <div style={{ overflow: "visible" }}>
        <StoriesRow profile={profile} />
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {STATS.map(s => <BentoStat key={s.label} {...s} />)}
      </div>

      {/* ── BENTO GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "auto", gap: 12 }}>

        {/* ── PROFILE CARD (col 1-4, row 1-2) ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            gridColumn: "1 / 5", gridRow: "1 / 3",
            borderRadius: 20, overflow: "hidden",
            background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Banner */}
          <div style={{ height: 80, background: "linear-gradient(135deg,#1a0840,#7C3AED 55%,#06B6D4 100%)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(6,182,212,0.35)", filter: "blur(40px)", pointerEvents: "none" }} />
          </div>

          <div style={{ padding: "0 20px 20px", marginTop: -36 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 18, overflow: "hidden",
                  background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 26, color: "#fff",
                  border: "3px solid rgba(12,14,28,0.9)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.3)",
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : profile?.username?.[0]?.toUpperCase() || "P"
                  }
                </div>
                <span style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2px solid rgba(12,14,28,0.9)" }} />
              </div>

              <div style={{ flex: 1, paddingBottom: 2 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {profile?.username || "Player"}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)", fontWeight: 700 }}>
                    Level {level}
                  </span>
                  {profile?.verified && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.22)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                      <Shield size={8} /> Verified
                    </span>
                  )}
                </div>
              </div>

              <XpRing xp={profile?.xp || 0} level={level} size={72} />
            </div>

            {/* XP bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)", marginBottom: 6 }}>
                <span>Season XP</span>
                <span style={{ color: "#a78bfa" }}>{profile?.xp || 0} / 1000</span>
              </div>
              <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#7C3AED,#06B6D4)", position: "relative", overflow: "hidden" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                >
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,0.12) 8px,rgba(255,255,255,0.12) 16px)" }} />
                </motion.div>
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Matches", value: stats?.tournaments_played ?? 0 },
                { label: "Wins",    value: stats?.wins ?? 0 },
                { label: "Win%",    value: `${winRate}%` },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", lineHeight: 1, margin: "0 0 3px", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* KD + Kills row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Total Kills", value: stats?.kills ?? 0,       icon: Flame,    color: "#ef4444" },
                { label: "K/D Ratio",   value: stats?.kd_ratio != null ? Number(stats.kd_ratio).toFixed(2) : "—", icon: BarChart3, color: "#10b981" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}14`, flexShrink: 0 }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", lineHeight: 1, margin: "0 0 2px", fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: 0.3 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/profile"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%", padding: "9px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, textDecoration: "none", transition: "all 0.2s", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              View Full Profile <ArrowUpRight size={11} />
            </Link>
          </div>
        </motion.div>

        {/* ── PERFORMANCE CHART (col 5-12, row 1) ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            gridColumn: "5 / 13", gridRow: "1",
            borderRadius: 20, padding: 22,
            background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                <Activity size={13} style={{ color: "#7C3AED" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>Performance</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Weekly XP activity</p>
            </div>
            <span style={{ fontSize: 11, padding: "5px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
              7 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="90%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} dy={8} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(124,58,237,0.2)", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "#7C3AED", stroke: "rgba(124,58,237,0.3)", strokeWidth: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ── STAT TRIO (col 5-12, row 2) ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ gridColumn: "5 / 13", gridRow: "2", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
        >
          {[
            { label: "Matches Played", value: stats?.tournaments_played ?? 0, icon: Swords,  color: "#7C3AED" },
            { label: "Total Wins",     value: stats?.wins ?? 0,               icon: Trophy,  color: "#f59e0b" },
            { label: "KD Ratio",       value: stats?.kd_ratio != null ? parseFloat(Number(stats.kd_ratio).toFixed(2)) : 0, icon: Target, color: "#10b981" },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <div key={label} style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}14`, border: `1px solid ${color}20` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: "#f8fafc", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  <AnimatedNum value={value} />
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── TOURNAMENTS (col 1-5, row 3) ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            gridColumn: "1 / 6", gridRow: "3",
            borderRadius: 20, overflow: "hidden",
            background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.15)" }}>
                <Swords size={12} style={{ color: "#7C3AED" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Tournaments</span>
            </div>
            <Link to="/tournaments" style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#a78bfa"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#7C3AED"; }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: "0 8px 8px" }}>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 12, background: "rgba(255,255,255,0.03)", margin: "4px 8px", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))
            ) : tournaments.length > 0 ? (
              tournaments.slice(0, 5).map((t, i) => <TournamentItem key={t.id} t={t} idx={i} />)
            ) : (
              <div style={{ padding: "36px 0", textAlign: "center" }}>
                <Radio size={22} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>No active tournaments</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── QUICK ACTIONS (col 6-10, row 3) ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ gridColumn: "6 / 10", gridRow: "3", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", margin: "2px 0 6px" }}>Quick Access</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
            <QuickAction to="/store"         icon={Sparkles} label="Store"      color="#f59e0b" delay={0.24} />
            <QuickAction to="/daily-rewards" icon={Gift}     label="Daily"      color="#10b981" delay={0.27} />
            <QuickAction to="/achievements"  icon={Medal}    label="Badges"     color="#7C3AED" delay={0.30} />
            <QuickAction to="/leaderboard"   icon={Crown}    label="Rankings"   color="#06b6d4" delay={0.33} />
          </div>
        </motion.div>

        {/* ── SEASON CARD (col 10-13, row 3) ── */}
        {season ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              gridColumn: "10 / 13", gridRow: "3",
              borderRadius: 20, padding: 18, overflow: "hidden", position: "relative",
              background: "linear-gradient(135deg, rgba(14,5,41,0.95), rgba(26,10,69,0.95))",
              border: "1px solid rgba(124,58,237,0.22)",
            }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(245,158,11,0.12)", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Star size={12} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, textTransform: "uppercase" }}>Active Season</span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", margin: "0 0 6px", fontFamily: "'Space Grotesk', sans-serif" }}>{season.name}</p>
              {season.end_date && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", display: "flex", alignItems: "center", gap: 5, margin: "0 0 14px" }}>
                  <Clock size={10} />
                  Ends {new Date(season.end_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              )}
              <Link
                to="/leaderboard"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "rgba(245,158,11,0.14)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.28)", fontSize: 11, fontWeight: 700, textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.22)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.14)"; }}
              >
                <Crown size={11} /> View Rankings
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.5 }}
            style={{
              gridColumn: "10 / 13", gridRow: "3",
              borderRadius: 20, padding: 18,
              background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>XP Progress</p>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                <span>{profile?.xp || 0} XP</span>
                <span>1000 XP</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg,#7C3AED,#06b6d4)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
                />
              </div>
              <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}>
                <Zap size={10} /> Level {level} → {level + 1}
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
