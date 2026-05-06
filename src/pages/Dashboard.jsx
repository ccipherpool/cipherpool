import { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  Trophy, Zap, Target, TrendingUp, Gift, Star,
  ShoppingBag, BarChart3, Shield, ArrowRight, Flame,
  Crown, Sword, Coins, Users, ChevronRight, Play,
} from "lucide-react";

/* ── Animated counter ── */
function Counter({ to, duration = 1.2 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(to) || 0;
    if (end === 0) return;
    const step = end / (duration * 60);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [to]);
  return <>{typeof to === "number" ? val.toLocaleString("fr-FR") : to}</>;
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [.22, 1, .36, 1] }}
      className="relative overflow-hidden rounded-2xl p-5 group"
      style={{ background: "rgba(8,8,22,0.9)", border: `1px solid ${color}18` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at top right,${color}10,transparent 65%)` }} />
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${color}50,transparent)` }} />

      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[.2em] mt-1">{label}</span>
      </div>
      <p className="text-3xl font-black tracking-tighter" style={{ color }}>
        <Counter to={typeof value === "number" ? value : 0} />
        {typeof value === "string" && !Number(value) ? value : ""}
        {typeof value === "string" && value.endsWith("%") ? "%" : ""}
      </p>
    </motion.div>
  );
}

/* ── Tournament row ── */
function TournamentRow({ t, i }) {
  const s = {
    active:    { label: "EN COURS", color: "#22d3ee" },
    upcoming:  { label: "À VENIR",  color: "#f97316" },
    completed: { label: "TERMINÉ",  color: "rgba(255,255,255,.2)" },
  }[t.status] || { label: "À VENIR", color: "#f97316" };

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
      <Link
        to={`/tournaments/${t.id}`}
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
        style={{ border: "1px solid transparent" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.18)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.18)" }}>
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{t.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono" style={{ color: "#f97316" }}>{(t.prize_coins || 0).toLocaleString()} CP</span>
            <span className="text-white/20">·</span>
            <span className="text-[11px] text-white/30">{t.current_players || 0}/{t.max_players || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}18` }}>{s.label}</span>
          <ChevronRight size={13} className="text-white/20 group-hover:text-indigo-400 transition-colors" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Quick links ── */
const QUICK = [
  { icon: Trophy,      label: "Tournois",   sub: "Jouer",     to: "/tournaments",   c: "#818cf8" },
  { icon: Shield,      label: "Clans",      sub: "Rejoins",   to: "/clans",         c: "#a78bfa" },
  { icon: ShoppingBag, label: "Boutique",   sub: "Dépense",   to: "/store",         c: "#f97316" },
  { icon: BarChart3,   label: "Classement", sub: "Ton rang",  to: "/leaderboard",   c: "#22d3ee" },
  { icon: Gift,        label: "Daily",      sub: "Bonus",     to: "/daily-rewards", c: "#f43f5e" },
  { icon: Star,        label: "Succès",     sub: "Badges",    to: "/achievements",  c: "#fbbf24" },
];

export default function Dashboard() {
  const { profile, balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [topPlayers, setTopPlayers]   = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchAll(); }, [profile?.id]);

  const fetchAll = async () => {
    try {
      const [{ data: tourney }, { data: top }, { data: stats }] = await Promise.all([
        supabase.from("tournaments").select("id,name,status,prize_coins,max_players,current_players")
          .in("status", ["active", "upcoming"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("player_stats").select("user_id,total_points,wins,tournaments_played")
          .order("total_points", { ascending: false }).limit(5),
        profile?.id
          ? supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle()
          : { data: null },
      ]);
      setTournaments(tourney || []);
      setPlayerStats(stats);
      if (top?.length) {
        const ids = top.map(t => t.user_id).filter(Boolean);
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
          const pMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
          setTopPlayers(top.map((s, i) => ({ ...s, rank: i + 1, name: pMap[s.user_id]?.full_name || "Joueur", avatar: pMap[s.user_id]?.avatar_url })));
        }
      }
    } catch (_) {}
    setLoading(false);
  };

  const level   = profile?.level || 1;
  const xp      = profile?.xp || 0;
  const xpPct   = Math.min(100, (xp % 1000) / 10);
  const xpNext  = Math.ceil((xp + 1) / 1000) * 1000;
  const wins    = playerStats?.wins || 0;
  const matches = playerStats?.tournaments_played || 0;
  const pts     = playerStats?.total_points || 0;
  const wr      = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Joueur";

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .db-hero-grid{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
        @media(max-width:640px){.db-hero-grid{grid-template-columns:1fr;gap:16px}}
        .db-quick-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        @media(max-width:900px){.db-quick-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:540px){.db-quick-grid{grid-template-columns:repeat(3,1fr)}}
        .db-bottom-grid{display:grid;grid-template-columns:1fr 280px;gap:20px}
        @media(max-width:900px){.db-bottom-grid{grid-template-columns:1fr}}
        .db-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        @media(max-width:700px){.db-stats-grid{grid-template-columns:repeat(2,1fr)}}
        .quick-card:hover{transform:translateY(-4px);border-color:var(--acc)!important}
        .quick-card{transition:all .2s ease}
        @keyframes db-pulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes db-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .db-gradient-text{background:linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd,#22d3ee);background-size:300% 300%;animation:db-flow 4s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .db-xp-bar{background:linear-gradient(90deg,#4f46e5,#818cf8,#22d3ee);background-size:200% 100%;animation:db-flow 2s linear infinite}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Space Grotesk',sans-serif" }}>

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [.22, 1, .36, 1] }}
          style={{
            position: "relative", overflow: "hidden", borderRadius: 22,
            padding: "32px 32px", background: "rgba(6,6,18,0.98)",
            border: "1px solid rgba(99,102,241,0.18)",
            boxShadow: "0 0 80px rgba(99,102,241,0.08), 0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Glow blobs */}
          <div style={{ position: "absolute", top: -60, right: -40, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.07),transparent 65%)", pointerEvents: "none" }} />
          {/* Top + Bottom accent lines */}
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 2, background: "linear-gradient(90deg,transparent,#818cf8,#22d3ee,transparent)" }} />
          <div style={{ position: "absolute", inset: "auto 0 0 0", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)" }} />

          <div className="db-hero-grid" style={{ position: "relative" }}>
            {/* Left */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "4px 12px", borderRadius: 99, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee", animation: "db-pulse 2s infinite" }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: "#22d3ee", letterSpacing: 2 }}>SAISON 1 ACTIVE</span>
              </div>

              <h1 style={{ fontSize: "clamp(22px,4vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 8px" }}>
                <span style={{ color: "rgba(255,255,255,.85)" }}>BON RETOUR, </span>
                <span className="db-gradient-text">{firstName.toUpperCase()} 👋</span>
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 22, lineHeight: 1.6 }}>
                {matches > 0
                  ? `${matches} match${matches > 1 ? "s" : ""} joués · ${wins} victoire${wins > 1 ? "s" : ""} · Continue à grinder.`
                  : "Lance-toi dans ton premier tournoi et grimpe le classement !"}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link to="/tournaments" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                  borderRadius: 12, fontWeight: 800, fontSize: 13, color: "#fff", textDecoration: "none",
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
                  transition: "opacity .2s",
                }}>
                  <Play size={14} fill="white" /> Jouer maintenant
                </Link>
                <Link to="/daily-rewards" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                  borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#f97316", textDecoration: "none",
                  background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
                }}>
                  <Gift size={14} /> Daily Bonus
                </Link>
              </div>
            </div>

            {/* XP Panel */}
            <motion.div
              initial={{ opacity: 0, scale: .95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: .2 }}
              style={{
                minWidth: 210, padding: "20px 22px", borderRadius: 18,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 2, marginBottom: 3 }}>NIVEAU</p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: "#a78bfa", lineHeight: 1 }}>{level}</p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Crown size={22} style={{ color: "#a78bfa" }} />
                </div>
              </div>

              <div style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)" }}>{xp.toLocaleString()} XP</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.25)" }}>{xpNext.toLocaleString()}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1.4, ease: [.22, 1, .36, 1], delay: .4 }}
                    className="db-xp-bar"
                    style={{ height: "100%", borderRadius: 99 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                {[
                  { v: wins,      c: "#f97316", l: "WINS" },
                  { v: `${wr}%`,  c: "#22d3ee", l: "W/R" },
                  { v: pts > 999 ? `${(pts/1000).toFixed(1)}k` : pts, c: "#a78bfa", l: "PTS" },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: s.c }}>{s.v}</p>
                    <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "rgba(255,255,255,.22)", letterSpacing: 1 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── STAT CARDS ── */}
        <div className="db-stats-grid">
          <StatCard delay={0.05} icon={Trophy}     label="Pièces CP"  value={balance || 0}  color="#f97316" />
          <StatCard delay={0.1}  icon={Zap}        label="XP Total"   value={xp}             color="#818cf8" />
          <StatCard delay={0.15} icon={Flame}      label="Victoires"  value={wins}           color="#a78bfa" />
          <StatCard delay={0.2}  icon={TrendingUp} label="Win Rate"   value={`${wr}%`}        color="#22d3ee" />
        </div>

        {/* ── QUICK ACCESS ── */}
        <div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: 3, marginBottom: 12 }}>ACCÈS RAPIDE</p>
          <div className="db-quick-grid">
            {QUICK.map((q, i) => (
              <motion.div
                key={q.to}
                initial={{ opacity: 0, scale: .88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: .04 * i, ease: [.22, 1, .36, 1] }}
              >
                <Link
                  to={q.to}
                  className="quick-card"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px",
                    borderRadius: 16, textDecoration: "none",
                    background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)",
                    "--acc": q.c + "40",
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${q.c}12`, border: `1px solid ${q.c}22` }}>
                    <q.icon size={19} style={{ color: q.c }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{q.label}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{q.sub}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM GRID: Tournaments + Top Players ── */}
        <div className="db-bottom-grid">

          {/* Active Tournaments */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .25 }}
            style={{ borderRadius: 20, overflow: "hidden", background: "rgba(8,8,22,0.9)", border: "1px solid rgba(255,255,255,.06)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={14} style={{ color: "#818cf8" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Tournois Actifs</span>
              </div>
              <Link to="/tournaments" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#818cf8", textDecoration: "none" }}>
                Voir tout <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ padding: "8px 8px" }}>
              {tournaments.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: 3 }}>AUCUN TOURNOI ACTIF</p>
                </div>
              ) : tournaments.map((t, i) => <TournamentRow key={t.id} t={t} i={i} />)}
            </div>
          </motion.div>

          {/* Top Players */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .32 }}
            style={{ borderRadius: 20, overflow: "hidden", background: "rgba(8,8,22,0.9)", border: "1px solid rgba(255,255,255,.06)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Crown size={14} style={{ color: "#f97316" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Top Joueurs</span>
              </div>
              <Link to="/leaderboard" style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textDecoration: "none" }}>Tout →</Link>
            </div>

            <div>
              {topPlayers.length === 0 ? (
                <div style={{ padding: "36px 0", textAlign: "center" }}>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: 3 }}>AUCUN JOUEUR</p>
                </div>
              ) : topPlayers.map((p, i) => {
                const MEDALS = ["🥇", "🥈", "🥉"];
                const rowColors = ["rgba(249,115,22,.06)", "rgba(160,160,180,.04)", "rgba(160,120,60,.04)"];
                return (
                  <motion.div
                    key={p.user_id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: .07 * i }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                      background: i < 3 ? rowColors[i] : "transparent",
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: i < 3 ? "transparent" : "rgba(255,255,255,.04)" }}>
                      {i < 3 ? MEDALS[i] : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.3)" }}>{p.rank}</span>}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
                      {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 1 }}>{(p.total_points || 0).toLocaleString()} pts</p>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{p.wins}W</span>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
              <Link to="/leaderboard" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#818cf8", textDecoration: "none" }}>
                Classement complet →
              </Link>
            </div>
          </motion.div>
        </div>

      </div>
    </>
  );
}
