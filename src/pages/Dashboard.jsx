// src/pages/Dashboard.jsx — CipherPool Player Hub v5 ULTIMATE
// 🔥 Pro · Addictive · Animated · Real data only · 100% responsive
import { useOutletContext, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

// ─── PALETTE PREMIUM ─────────────────────────────────────────────────────────
const P = {
  bg:     "#050508",
  surf:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  purple: "#7c3aed",
  purpleLight: "#a78bfa",
  cyan:   "#06b6d4",
  green:  "#22c55e",
  gold:   "#fbbf24",
  red:    "#ef4444",
  orange: "#f97316",
  indigo: "#818cf8",
  pink:   "#ec4899",
};

const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n ?? 0);

// ─── DIVISION SYSTEM (gamified) ──────────────────────────────────────────────
const DIVISIONS = [
  { min: 0,    max: 0,     label: "SANS RANG",  color: "#4b5563", icon: "🌑", bgGradient: "from-gray-800 to-gray-900", requirement: "Joue ton 1er tournoi" },
  { min: 1,    max: 100,   label: "BRONZE",     color: "#b45309", icon: "🥉", bgGradient: "from-amber-800 to-orange-900", requirement: "Top 100" },
  { min: 101,  max: 300,   label: "ARGENT",     color: "#94a3b8", icon: "🥈", bgGradient: "from-gray-500 to-gray-700", requirement: "Top 300" },
  { min: 301,  max: 600,   label: "OR",         color: "#fbbf24", icon: "🥇", bgGradient: "from-yellow-600 to-amber-700", requirement: "Top 600" },
  { min: 601,  max: 1000,  label: "PLATINE",    color: "#06b6d4", icon: "💎", bgGradient: "from-cyan-600 to-blue-700", requirement: "Top 1000" },
  { min: 1001, max: 2000,  label: "DIAMANT",    color: "#a855f7", icon: "💠", bgGradient: "from-purple-600 to-pink-700", requirement: "Top 2000" },
  { min: 2001, max: 5000,  label: "MASTER",     color: "#ec4899", icon: "👑", bgGradient: "from-pink-600 to-rose-700", requirement: "Top 5000" },
  { min: 5001, max: Infinity, label: "LÉGENDAIRE", color: "#f97316", icon: "🏆", bgGradient: "from-orange-600 to-red-700", requirement: "Top 10000+" },
];

const getDivision = rank => {
  if (!rank || rank === 0) return DIVISIONS[0];
  return DIVISIONS.find(d => rank >= d.min && rank <= d.max) || DIVISIONS[DIVISIONS.length-1];
};

const ROLES = {
  super_admin: { label:"SUPER ADMIN", color:"#06b6d4", icon:"👑", badge:"bg-cyan-500/20 border-cyan-500/30" },
  admin:       { label:"ADMIN",       color:P.indigo,  icon:"🛡️", badge:"bg-indigo-500/20 border-indigo-500/30" },
  founder:     { label:"FONDATEUR",   color:P.purple,  icon:"⚡", badge:"bg-purple-500/20 border-purple-500/30" },
  fondateur:   { label:"FONDATEUR",   color:P.purple,  icon:"⚡", badge:"bg-purple-500/20 border-purple-500/30" },
  user:        { label:"JOUEUR",      color:"#6b7280", icon:"🎮", badge:"bg-white/5 border-white/10" },
};

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setS(Math.max(0, Math.floor((new Date(target) - Date.now())/1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!s || s <= 0) return null;
  const h = Math.floor(s/3600).toString().padStart(2,"0");
  const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
  const sec = (s%60).toString().padStart(2,"0");
  return s < 3600 ? `${m}:${sec}` : `${h}:${m}:${sec}`;
}

// ─── COMPOSANTS UI ────────────────────────────────────────────────────────────
const LiveDot = ({ color = P.red, size = 8, pulse = true }) => (
  <span style={{
    display:"inline-block", width:size, height:size,
    borderRadius:"50%", background:color, flexShrink:0,
    boxShadow:`0 0 ${size*1.2}px ${color}`,
    animation: pulse ? "pulse-red 1.2s ease-in-out infinite" : "none",
  }}/>
);

const GlowCard = ({ children, color, onClick, className = "" }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      background: `linear-gradient(135deg, ${color}08, rgba(0,0,0,0.2))`,
      border: `1px solid ${color}25`,
      borderRadius: 20,
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
    }}
  >
    <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
    <div style={{ padding: "18px 20px" }}>{children}</div>
  </motion.div>
);

const Badge = ({ color, children, glow = false }) => (
  <span style={{
    fontSize: 10, fontWeight: 700,
    color, background: `${color}12`,
    border: `1px solid ${color}30`,
    padding: "4px 12px", borderRadius: 99,
    boxShadow: glow ? `0 0 12px ${color}40` : "none",
    display: "inline-flex", alignItems: "center", gap: 6,
  }}>
    {children}
  </span>
);

// ─── TOURNAMENT CARD (Premium) ────────────────────────────────────────────────
function TournamentCard({ t, idx }) {
  const nav = useNavigate();
  const pct = t.max_players > 0 ? Math.round((t.current_players/t.max_players)*100) : 0;
  const remaining = t.max_players - (t.current_players ?? 0);
  const isLive = t.status === "in_progress";
  const isFull = pct >= 100;
  const isHot = pct >= 70 && !isFull;
  const isFree = !t.entry_fee || t.entry_fee === 0;
  const countdown = useCountdown(t.start_date);
  const accentColor = isLive ? P.red : P.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.4, type: "spring", stiffness: 200 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => nav(`/tournaments/${t.id}`)}
      style={{
        background: `linear-gradient(145deg, ${isLive ? "rgba(239,68,68,0.04)" : "rgba(124,58,237,0.02)"}, #050508)`,
        border: `1px solid ${accentColor}25`,
        borderRadius: 20, overflow: "hidden", cursor: "pointer", position: "relative",
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${isLive ? P.orange : P.cyan})` }} />

      {/* Badges flottants */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
        {isLive && <Badge color={P.red} glow>⚡ LIVE</Badge>}
        {remaining <= 3 && !isFull && <Badge color={P.orange}>🔥 {remaining} PLACE{remaining>1?"S":""}</Badge>}
        {isHot && remaining > 3 && <Badge color={P.gold}>🔥 CHAUD</Badge>}
        {isFull && <Badge color="#6b7280">🔒 COMPLET</Badge>}
        {isFree && !isFull && <Badge color={P.green}>🎁 GRATUIT</Badge>}
      </div>

      <div style={{ padding: "16px 18px 18px" }}>
        <h3 style={{
          fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 10px",
          paddingRight: 80, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
        }}>
          {t.name}
        </h3>

        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            🏆 <b style={{ color: P.gold }}>{fmt(t.prize_coins)}</b> CP
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            👥 {t.current_players}/{t.max_players}
          </span>
          {t.mode && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>🎮 {t.mode}</span>}
        </div>

        {countdown && !isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, background: "rgba(251,191,36,0.08)", padding: "6px 12px", borderRadius: 30, width: "fit-content" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>⏳ DÉPART</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: P.gold, fontFamily: "monospace" }}>{countdown}</span>
          </div>
        )}

        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: idx * 0.05 }}
            style={{
              height: "100%", borderRadius: 99,
              background: pct >= 80 ? `linear-gradient(90deg, ${P.red}, ${P.orange})` : `linear-gradient(90deg, ${P.purple}, ${P.cyan})`
            }}
          />
        </div>

        <button
          onClick={e => { e.stopPropagation(); nav(`/tournaments/${t.id}`); }}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            cursor: isFull ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
            background: isFull ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${accentColor}, ${isLive ? P.orange : P.cyan})`,
            color: isFull ? "rgba(255,255,255,0.3)" : "#fff",
            boxShadow: !isFull ? `0 4px 15px ${accentColor}40` : "none",
            transition: "all 0.2s",
          }}
        >
          {isFull ? "🔒 COMPLET" : isLive ? "🎮 REJOINDRE LE MATCH" : "⚡ S'INSCRIRE"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── STAT CARD WITH ANIMATED COUNTER ──────────────────────────────────────────
function AnimatedCounter({ value, suffix = "", color }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, lineHeight: 1, color }}>{fmt(count)}{suffix}</span>;
}

function StatCard({ icon, label, value, suffix = "", color, trend, delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, type: "spring", stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: `linear-gradient(145deg, ${color}08, rgba(0,0,0,0.2))`,
        border: `1px solid ${color}20`,
        borderRadius: 18, padding: "18px 16px", cursor: "pointer",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color, opacity: 0.05, filter: "blur(20px)" }} />
      <div style={{ width: 38, height: 38, background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{icon}</div>
      <AnimatedCounter value={value} suffix={suffix} color={color} />
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 6 }}>{label}</div>
      {trend && <div style={{ fontSize: 10, color: trend.positive ? P.green : "rgba(255,255,255,0.4)", marginTop: 6 }}>{trend.text}</div>}
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();
  const { profile, balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ played: 0, wins: 0, kills: 0, winRate: 0, rank: null, total_points: 0, top3: 0, kd: 0 });
  const [daily, setDaily] = useState(null);
  const [liveData, setLiveData] = useState({ liveCount: 0, onlineCount: 0, lastWinner: null, activeUsers: [] });
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  const coins = balance ?? 0;
  const role = ROLES[profile?.role] ?? ROLES.user;
  const approved = profile?.verification_status === "approved";
  const firstName = (profile?.full_name?.split(" ")[0] ?? "JOUEUR").toUpperCase();
  const division = getDivision(stats.rank);
  const nextProgress = stats.rank ? (() => {
    const currentIdx = DIVISIONS.findIndex(d => stats.rank >= d.min && stats.rank <= d.max);
    const nextDiv = DIVISIONS[currentIdx + 1];
    if (!nextDiv) return null;
    const progress = ((stats.rank - division.min) / (division.max - division.min)) * 100;
    return { nextRank: nextDiv.label, progress: Math.min(100, progress), requirement: nextDiv.requirement };
  })() : null;

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!profile?.id) return;

    const today = new Date().toISOString().split("T")[0];

    const [
      { data: trn },
      { data: st },
      { data: msgs },
      { data: claims },
      { data: lastResult },
      { data: onlineProfiles },
      { data: activeMatches },
    ] = await Promise.all([
      supabase.from("tournaments").select("id,name,status,max_players,current_players,prize_coins,entry_fee,mode,start_date").in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(6),
      supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle(),
      supabase.from("admin_messages").select("*").order("created_at", { ascending: false }).limit(3),
      supabase.from("user_daily_claims").select("*").eq("user_id", profile.id).order("claimed_at", { ascending: false }).limit(7),
      supabase.from("match_results").select("user_id, points, profiles!match_results_user_id_fkey(full_name)").eq("status", "verified").eq("placement", 1).order("submitted_at", { ascending: false }).limit(1),
      supabase.from("profiles").select("id, full_name").gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      supabase.from("tournaments").select("id").eq("status", "in_progress"),
    ]);

    setTournaments(trn ?? []);
    setMessages(msgs ?? []);
    if (st) setStats({
      played: st.tournaments_played ?? 0,
      wins: st.wins ?? 0,
      kills: st.kills ?? 0,
      winRate: st.wins > 0 && st.tournaments_played > 0 ? Math.round((st.wins / st.tournaments_played) * 100) : 0,
      rank: st.rank ?? null,
      total_points: st.total_points ?? 0,
      top3: st.top3_finishes ?? 0,
      kd: st.kd_ratio ?? (st.tournaments_played > 0 ? (st.kills / st.tournaments_played).toFixed(2) : 0),
    });

    const liveCount = (activeMatches ?? []).length;
    const onlineCount = (onlineProfiles ?? []).length;
    const lastWinner = lastResult?.[0] ? { name: lastResult[0].profiles?.full_name || "Joueur", points: lastResult[0].points } : null;
    setLiveData({ liveCount, onlineCount, lastWinner, activeUsers: onlineProfiles ?? [] });

    const todayClaim = (claims ?? []).find(c => new Date(c.claimed_at).toDateString() === new Date().toDateString());
    const streak = claims?.length ?? 0;
    setDaily({ canClaim: !todayClaim, streak, nextBonus: streak % 7 === 0 && streak > 0 ? "🔥 Bonus hebdo débloqué!" : null });

    // Missions dynamiques
    if (st) {
      const m = [];
      if (st.tournaments_played === 0) m.push({ icon: "🎮", text: "Joue ton 1er tournoi", prog: 0, target: 1, done: false, reward: 100 });
      else if (st.wins === 0) m.push({ icon: "🏆", text: "Gagne ton 1er tournoi", prog: 0, target: 1, done: false, reward: 200 });
      else m.push({ icon: "🏆", text: "Victoires", prog: st.wins, target: Math.max(5, st.wins + 3), done: false, reward: 150 });
      m.push({ icon: "🎯", text: "Kills", prog: st.kills, target: Math.max(10, st.kills + 5), done: false, reward: 100 });
      if (!todayClaim) m.push({ icon: "🎁", text: "Bonus quotidien", prog: 0, target: 1, done: false, reward: 50 });
      else m.push({ icon: "🎁", text: "Bonus réclamé", prog: 1, target: 1, done: true, reward: 0 });
      setMissions(m.slice(0, 3));
    }
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    load();

    // Welcome toast on first visit
    const hasSeenWelcome = localStorage.getItem("cipher_welcome_v2");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 4000);
      localStorage.setItem("cipher_welcome_v2", "true");
    }

    const channel = supabase.channel(`hub-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, (p) => {
        if (p.eventType === "INSERT" && ["open", "in_progress"].includes(p.new.status))
          setTournaments(prev => [p.new, ...prev].slice(0, 6));
        else if (p.eventType === "UPDATE")
          setTournaments(prev => prev.map(t => t.id === p.new.id ? p.new : t).filter(t => ["open", "in_progress"].includes(t.status)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "player_stats", filter: `user_id=eq.${profile.id}` }, (p) => {
        const s = p.new;
        setStats({
          played: s.tournaments_played ?? 0,
          wins: s.wins ?? 0,
          kills: s.kills ?? 0,
          rank: s.rank ?? null,
          total_points: s.total_points ?? 0,
          top3: s.top3_finishes ?? 0,
          kd: s.kd_ratio ?? 0,
          winRate: s.wins > 0 && s.tournaments_played > 0 ? Math.round((s.wins / s.tournaments_played) * 100) : 0,
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, load]);

  const nextTournoi = tournaments.find(t => t.status === "open" && t.start_date);
  const countdownNext = useCountdown(nextTournoi?.start_date);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div>
        <div style={{ width: 50, height: 50, border: "3px solid rgba(124,58,237,0.2)", borderTopColor: P.purple, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: P.bg, color: "#fff", fontFamily: "'Inter',sans-serif", padding: "24px clamp(12px,5vw,48px) 80px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse-red { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 5px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 20px rgba(124,58,237,0.6)} }
        .gradient-text { background: linear-gradient(135deg, #7c3aed, #06b6d4, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-size: 200% 200%; animation: gradient 3s ease infinite; }
        @keyframes gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @media(max-width:768px){ .stats-grid{grid-template-columns:1fr 1fr!important} .tournament-grid{grid-template-columns:1fr!important} .missions-grid{grid-template-columns:1fr!important} }
      `}</style>

      {/* WELCOME TOAST */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            style={{ position: "fixed", top: 20, left: "50%", zIndex: 1000, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", borderRadius: 30, padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}
          >
            🔥 Bienvenue {firstName} ! Prêt à dominer l'arène ?
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 style={{ fontSize: "clamp(32px, 7vw, 58px)", fontWeight: 900, lineHeight: 1, margin: 0 }}>
              PRÊT À DOMINER,{" "}
              <span className="gradient-text">{firstName}</span>
              <span style={{ fontSize: 40, marginLeft: 8 }}>⚡</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge color={role.color} glow><span style={{ fontSize: 12 }}>{role.icon}</span> {role.label}</Badge>
            {approved && <Badge color={P.green}>✓ VÉRIFIÉ</Badge>}
            <Badge color={P.gold} glow>💎 {coins.toLocaleString()} CP</Badge>
            {stats.rank > 0 && <Badge color={division.color}>{division.icon} {division.label} · #{stats.rank}</Badge>}
          </div>
        </div>
      </motion.div>

      {/* LIVE BAR */}
      {(liveData.liveCount > 0 || liveData.onlineCount > 0 || liveData.lastWinner) && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 60, flexWrap: "wrap", backdropFilter: "blur(4px)" }}>
            <LiveDot />
            <span style={{ fontSize: 12, fontWeight: 800, color: P.red, letterSpacing: 1 }}>EN DIRECT</span>
            {liveData.liveCount > 0 && <span style={{ fontSize: 12 }}>🏟️ <b>{liveData.liveCount}</b> tournoi{liveData.liveCount > 1 ? "s" : ""} en cours</span>}
            {liveData.onlineCount > 0 && <span style={{ fontSize: 12 }}>🟢 <b>{liveData.onlineCount}</b> joueur{liveData.onlineCount > 1 ? "s" : ""} en ligne</span>}
            {liveData.lastWinner && <span style={{ fontSize: 12 }}>🏆 Dernier gagnant: <b style={{ color: P.gold }}>{liveData.lastWinner.name}</b> {liveData.lastWinner.points > 0 && <span style={{ color: P.green }}>+{liveData.lastWinner.points} pts</span>}</span>}
            {countdownNext && <span style={{ fontSize: 12 }}>⏳ Prochain départ: <b style={{ color: P.gold }}>{countdownNext}</b></span>}
            <button onClick={() => nav("/tournaments")} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: P.red, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 30, padding: "6px 16px", cursor: "pointer" }}>Voir tout →</button>
          </div>
        </motion.div>
      )}

      {/* TOURNOIS */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 24 }}>🎮</span><h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tournois actifs</h2><span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>({tournaments.length})</span></div>
          <button onClick={() => nav("/tournaments")} style={{ fontSize: 12, fontWeight: 600, color: P.purpleLight, background: "none", border: "none", cursor: "pointer" }}>Voir tous les tournois →</button>
        </div>
        {tournaments.length === 0 ? (
          <GlowCard color={P.purple} onClick={() => nav("/tournaments")}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <span style={{ fontSize: 48, animation: "float 2s ease-in-out infinite", display: "inline-block" }}>🏟️</span>
              <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>Aucun tournoi actif pour le moment</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Reviens bientôt ou consulte les tournois à venir</p>
            </div>
          </GlowCard>
        ) : (
          <div className="tournament-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 20 }}>
            {tournaments.map((t, i) => <TournamentCard key={t.id} t={t} idx={i} />)}
          </div>
        )}
      </div>

      {/* STATS + MISSIONS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28, marginBottom: 40 }}>
        {/* STATS SECTION */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ fontSize: 20 }}>📊</span><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Mes performances</h2></div>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <StatCard icon="🎮" label="TOURNOIS" value={stats.played} color={P.cyan} delay={0} onClick={() => nav("/stats")} trend={stats.played > 0 ? { text: `${stats.played} match${stats.played > 1 ? "s" : ""}`, positive: true } : null} />
            <StatCard icon="🏆" label="VICTOIRES" value={stats.wins} color={P.gold} delay={0.05} onClick={() => nav("/stats")} trend={stats.wins > 0 ? { text: `${stats.wins} win${stats.wins > 1 ? "s" : ""}`, positive: true } : null} />
            <StatCard icon="🎯" label="KILLS" value={stats.kills} color={P.purple} delay={0.1} onClick={() => nav("/stats")} />
            <StatCard icon="📈" label="WIN RATE" value={stats.winRate} suffix="%" color={P.green} delay={0.15} onClick={() => nav("/stats")} />
            <StatCard icon="🥉" label="TOP 3" value={stats.top3} color={P.orange} delay={0.2} onClick={() => nav("/stats")} />
            <StatCard icon="⚔️" label="K/D" value={parseFloat(stats.kd) || 0} color={P.pink} delay={0.25} onClick={() => nav("/stats")} />
          </div>
        </div>

        {/* MISSIONS + RANK */}
        <div>
          {/* MISSIONS */}
          {missions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ fontSize: 20 }}>🎯</span><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Missions du jour</h2></div>
              <div className="missions-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {missions.map((m, i) => {
                  const pct = m.target > 0 ? Math.min(100, Math.round((m.prog / m.target) * 100)) : 0;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                      style={{ padding: "14px 16px", borderRadius: 16, background: m.done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${m.done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>{m.icon}</span><span style={{ fontSize: 13, fontWeight: 600, color: m.done ? P.green : "#fff" }}>{m.text}</span></div>
                        {m.reward > 0 && !m.done && <span style={{ fontSize: 10, color: P.gold }}>+{m.reward} CP</span>}
                        {m.done && <span style={{ fontSize: 11, color: P.green }}>✓ COMPLÉTÉ</span>}
                      </div>
                      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} style={{ height: "100%", borderRadius: 99, background: m.done ? P.green : `linear-gradient(90deg, ${P.purple}, ${P.cyan})` }} />
                      </div>
                      {!m.done && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{m.prog}/{m.target}</div>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RANK PROGRESS */}
          {stats.rank > 0 && nextProgress && (
            <GlowCard color={division.color} onClick={() => nav("/leaderboard")}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: division.color, lineHeight: 1 }}>#{stats.rank}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{division.icon} {division.label}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Progression vers <b style={{ color: P.gold }}>{nextProgress.nextRank}</b></div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${nextProgress.progress}%` }} transition={{ duration: 1 }} style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${division.color}, ${P.gold})` }} />
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{Math.round(nextProgress.progress)}% — {nextProgress.requirement}</div>
                </div>
              </div>
            </GlowCard>
          )}
        </div>
      </div>

      {/* DAILY REWARDS */}
      {daily && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ fontSize: 20 }}>🎁</span><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Récompenses</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <GlowCard color={daily.canClaim ? P.gold : P.cyan} onClick={() => nav("/daily-rewards")}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 40, animation: daily.canClaim ? "float 1.5s ease-in-out infinite" : "none" }}>🎁</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Récompense quotidienne</div>
                  <div style={{ fontSize: 12, color: daily.canClaim ? P.gold : "rgba(255,255,255,0.4)" }}>{daily.canClaim ? "🔔 Disponible !" : "✓ Déjà réclamée aujourd'hui"}</div>
                  {daily.nextBonus && <div style={{ fontSize: 11, color: P.gold, marginTop: 4 }}>{daily.nextBonus}</div>}
                </div>
              </div>
            </GlowCard>
            <GlowCard color={P.red} onClick={() => nav("/daily-rewards")}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 40 }}>🔥</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Série actuelle</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: P.red, lineHeight: 1 }}>{daily.streak} jours</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{daily.streak >= 7 ? "Légendaire !" : daily.streak >= 3 ? "Bonne série !" : "Lance ta série"}</div>
                </div>
              </div>
            </GlowCard>
          </div>
        </motion.div>
      )}

      {/* QUICK ACTIONS */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ fontSize: 20 }}>⚡</span><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Actions rapides</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { icon: "🎮", label: "JOUER", sub: "Tournois", path: "/tournaments", color: P.purple },
            { icon: "📊", label: "CLASSEMENT", sub: "Mon rang", path: "/leaderboard", color: P.cyan },
            { icon: "🎁", label: "BONUS", sub: "Daily", path: "/daily-rewards", color: P.gold },
            { icon: "📈", label: "MES STATS", sub: "Kills & Wins", path: "/stats", color: P.green },
            { icon: "🏅", label: "SUCCÈS", sub: "Achievements", path: "/achievements", color: P.pink },
            { icon: "🛍️", label: "BOUTIQUE", sub: "Items", path: "/store", color: P.cyan },
            { icon: "👥", label: "ÉQUIPES", sub: "Team", path: "/teams", color: P.indigo },
            { icon: "📰", label: "ACTUS", sub: "News", path: "/news", color: P.orange },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.02 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => nav(item.path)}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${item.color}20`, borderRadius: 14, padding: "14px 12px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{item.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ANNOUNCEMENTS */}
      {messages.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ fontSize: 20 }}>📣</span><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Annonces</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(m => (
              <div key={m.id} style={{ padding: "14px 18px", background: "rgba(124,58,237,0.05)", borderLeft: `4px solid ${P.purple}`, borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{m.title || "ANNONCE"}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{m.content || m.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* STICKY BOTTOM CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(5,5,8,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(124,58,237,0.2)", display: "none" }} className="db-sticky">
        <button onClick={() => nav("/tournaments")} style={{ width: "100%", padding: "14px", borderRadius: 30, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>🚀 REJOINDRE UN TOURNOI</button>
      </div>
      <style>{`@media(max-width:768px){ .db-sticky{ display:block!important; } }`}</style>
    </div>
  );
}