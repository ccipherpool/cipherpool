import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { Wallet, Zap, Trophy, TrendingUp, Shield, ShoppingBag, BarChart3, Gift, Award, Crown } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, duration = 1.2 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(to) || 0;
    if (!end) return;
    let start = 0;
    const step = end / (duration * 60);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); } else setVal(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [to]);
  return <>{typeof to === "number" ? val.toLocaleString("fr-FR") : to}</>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: [.22,1,.36,1] }}
      style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "20px 20px 18px", background: "rgba(5,7,18,0.95)", border: `1px solid ${color}15`, transition: "box-shadow 0.3s" }}
      whileHover={{ boxShadow: `0 12px 32px ${color}18` }}
      className="group">
      <div style={{ position: "absolute", inset: 0, opacity: 0, background: `radial-gradient(circle at top right, ${color}10, transparent 65%)`, transition: "opacity 0.4s" }} className="stat-glow" />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}45,transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}10`, border: `1px solid ${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.18)", letterSpacing: 2, marginTop: 4 }}>{label}</span>
      </div>
      <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>
        <Counter to={typeof value === "number" ? value : 0} />
        {typeof value === "string" ? value : ""}
      </p>
      <style>{`.group:hover .stat-glow{opacity:1!important}`}</style>
    </motion.div>
  );
}

// ── Tournament row ────────────────────────────────────────────────────────────
function TRow({ t, i }) {
  const s = { active: { label: "EN COURS", color: CYAN }, upcoming: { label: "À VENIR", color: ORANGE }, completed: { label: "TERMINÉ", color: "rgba(255,255,255,.2)" } }[t.status] || { label: "À VENIR", color: ORANGE };
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
      <Link to={`/tournaments/${t.id}`}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, transition: "all 0.18s", textDecoration: "none", border: "1px solid transparent" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,212,255,0.04)"; e.currentTarget.style.borderColor = "rgba(0,212,255,0.14)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.14)", flexShrink: 0 }}>
          <Trophy size={16} style={{ color: CYAN }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: ORANGE }}>{(t.prize_coins || 0).toLocaleString()} CP</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.current_players || 0}/{t.max_players || 0}</span>
          </div>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 99, color: s.color, background: `${s.color}14`, flexShrink: 0 }}>{s.label}</span>
      </Link>
    </motion.div>
  );
}

// ── Quick link items ──────────────────────────────────────────────────────────
const QUICK = [
  { icon: Trophy,      label: "Tournois",   sub: "Jouer",     to: "/tournaments",   c: CYAN      },
  { icon: Shield,      label: "Clans",      sub: "Rejoins",   to: "/clans",         c: VIOLET    },
  { icon: ShoppingBag, label: "Boutique",   sub: "Dépense",   to: "/store",         c: ORANGE    },
  { icon: BarChart3,   label: "Classement", sub: "Ton rang",  to: "/leaderboard",   c: "#60a5fa" },
  { icon: Gift,        label: "Daily",      sub: "Bonus",     to: "/daily-rewards", c: RED       },
  { icon: Award,       label: "Succès",     sub: "Badges",    to: "/achievements",  c: "#fbbf24" },
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
        supabase.from("tournaments").select("id,name,status,prize_coins,max_players,current_players").in("status", ["active","upcoming"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("player_stats").select("user_id,total_points,wins,tournaments_played").order("total_points", { ascending: false }).limit(5),
        profile?.id ? supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle() : { data: null },
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

  const level     = profile?.level || 1;
  const xp        = profile?.xp || 0;
  const xpPct     = Math.min(100, (xp % 1000) / 10);
  const xpNext    = Math.ceil((xp + 1) / 1000) * 1000;
  const wins      = playerStats?.wins || 0;
  const matches   = playerStats?.tournaments_played || 0;
  const pts       = playerStats?.total_points || 0;
  const wr        = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const firstName = profile?.full_name?.split(" ")[0] || profile?.username || "Joueur";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
      <div style={{ width: 32, height: 32, border: `2px solid rgba(0,212,255,0.15)`, borderTopColor: CYAN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .db-hero{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
        @media(max-width:640px){.db-hero{grid-template-columns:1fr}}
        .db-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        @media(max-width:700px){.db-stats{grid-template-columns:repeat(2,1fr)}}
        .db-quick{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        @media(max-width:900px){.db-quick{grid-template-columns:repeat(3,1fr)}}
        .db-bottom{display:grid;grid-template-columns:1fr 280px;gap:20px}
        @media(max-width:900px){.db-bottom{grid-template-columns:1fr}}
        .quick-link{transition:all .2s ease}
        .quick-link:hover{transform:translateY(-4px)!important}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Space Grotesk',sans-serif" }}>

        {/* ── HERO ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [.22,1,.36,1] }}
          style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "30px 32px", background: "rgba(4,6,16,0.98)", border: `1px solid rgba(0,212,255,0.14)`, boxShadow: `0 0 80px rgba(0,212,255,0.05), 0 24px 60px rgba(0,0,0,0.5)` }}>
          {/* Glows */}
          <div style={{ position: "absolute", top: -60, right: -40, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.1),transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,212,255,0.06),transparent 65%)", pointerEvents: "none" }} />
          {/* Accent lines */}
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 2, background: `linear-gradient(90deg,transparent,${CYAN},${VIOLET},transparent)` }} />
          <div style={{ position: "absolute", inset: "auto 0 0 0", height: 1, background: `linear-gradient(90deg,transparent,rgba(0,212,255,0.25),transparent)` }} />
          {/* Grid overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" }} />

          <div className="db-hero" style={{ position: "relative" }}>
            {/* Left */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "4px 12px", borderRadius: 99, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: CYAN, boxShadow: `0 0 6px ${CYAN}`, animation: "pulse 2s infinite" }} />
                <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: CYAN, letterSpacing: 2 }}>SAISON 1 ACTIVE</span>
              </div>

              <h1 style={{ fontFamily: "Orbitron,sans-serif", fontSize: "clamp(22px,4vw,38px)", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.15, margin: "0 0 8px" }}>
                <span style={{ color: "rgba(255,255,255,0.85)" }}>BON RETOUR, </span>
                <span style={{ background: `linear-gradient(90deg,${CYAN},${VIOLET})`, backgroundSize: "200% 100%", animation: "flow 3s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{firstName.toUpperCase()} 👋</span>
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22, lineHeight: 1.6 }}>
                {matches > 0
                  ? `${matches} match${matches > 1 ? "s" : ""} joués · ${wins} victoire${wins > 1 ? "s" : ""} · Continue à grinder.`
                  : "Lance-toi dans ton premier tournoi et grimpe le classement !"}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link to="/tournaments" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 1, color: "#fff", textDecoration: "none", background: `linear-gradient(135deg,${CYAN},${VIOLET})`, boxShadow: `0 6px 24px rgba(0,212,255,0.3)`, transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 10px 32px rgba(0,212,255,0.45)`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,212,255,0.3)`}
                >
                  ⚡ JOUER MAINTENANT
                </Link>
                <Link to="/daily-rewards" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, fontWeight: 700, fontSize: 13, color: ORANGE, textDecoration: "none", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(249,115,22,0.18)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(249,115,22,0.1)"}
                >
                  🎁 Daily Bonus
                </Link>
              </div>
            </div>

            {/* XP Panel */}
            <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .2 }}
              style={{ minWidth: 210, padding: "22px", borderRadius: 18, background: `rgba(139,92,246,0.07)`, border: `1px solid rgba(139,92,246,0.2)`, backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <p style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 3 }}>NIVEAU</p>
                  <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 32, fontWeight: 900, color: VIOLET, lineHeight: 1 }}>{level}</p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👑</div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{xp.toLocaleString()} XP</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{xpNext.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.4, ease: [.22,1,.36,1], delay: .4 }}
                    style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${VIOLET},${CYAN})`, backgroundSize: "200% 100%", animation: "flow 2s linear infinite" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { v: wins,     c: ORANGE, l: "WINS"  },
                  { v: `${wr}%`, c: CYAN,   l: "W/R"   },
                  { v: pts > 999 ? `${(pts/1000).toFixed(1)}k` : pts, c: VIOLET, l: "PTS" },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 14, fontWeight: 900, color: s.c }}>{s.v}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── STAT CARDS ── */}
        <div className="db-stats">
          <StatCard delay={0.05} icon={Wallet}     label="PIÈCES CP"  value={balance || 0}  color={ORANGE} />
          <StatCard delay={0.10} icon={Zap}        label="XP TOTAL"   value={xp}            color={VIOLET} />
          <StatCard delay={0.15} icon={Trophy}     label="VICTOIRES"  value={wins}          color={CYAN}   />
          <StatCard delay={0.20} icon={TrendingUp} label="WIN RATE"   value={`${wr}%`}      color={GREEN}  />
        </div>

        {/* ── QUICK ACCESS ── */}
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 3, marginBottom: 12 }}>ACCÈS RAPIDE</p>
          <div className="db-quick">
            {QUICK.map((q, i) => (
              <motion.div key={q.to} initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .04 * i, ease: [.22,1,.36,1] }}>
                <Link to={q.to} className="quick-link"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 8px", borderRadius: 16, textDecoration: "none", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${q.c}35`; e.currentTarget.style.background = `${q.c}07`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${q.c}10`, border: `1px solid ${q.c}20` }}>
                    <q.icon size={20} style={{ color: q.c }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{q.label}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{q.sub}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM GRID ── */}
        <div className="db-bottom">

          {/* Active tournaments */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }}
            style={{ borderRadius: 20, overflow: "hidden", background: "rgba(4,6,16,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={15} style={{ color: CYAN }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Tournois Actifs</span>
              </div>
              <Link to="/tournaments" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: CYAN, textDecoration: "none" }}>
                Voir tout →
              </Link>
            </div>
            <div style={{ padding: "8px" }}>
              {tournaments.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🏆</div>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 3 }}>AUCUN TOURNOI ACTIF</p>
                </div>
              ) : tournaments.map((t, i) => <TRow key={t.id} t={t} i={i} />)}
            </div>
          </motion.div>

          {/* Top players */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .32 }}
            style={{ borderRadius: 20, overflow: "hidden", background: "rgba(4,6,16,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Crown size={15} style={{ color: ORANGE }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Top Joueurs</span>
              </div>
              <Link to="/leaderboard" style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textDecoration: "none" }}>Tout →</Link>
            </div>
            <div>
              {topPlayers.length === 0 ? (
                <div style={{ padding: "36px 0", textAlign: "center" }}>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 3 }}>AUCUN JOUEUR</p>
                </div>
              ) : topPlayers.map((p, i) => {
                const MEDALS = ["🥇", "🥈", "🥉"];
                const rowBg  = ["rgba(249,115,22,0.05)", "rgba(148,163,184,0.04)", "rgba(180,140,60,0.04)"];
                return (
                  <motion.div key={p.user_id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .07 * i }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i < 3 ? rowBg[i] : "transparent" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, background: i < 3 ? "transparent" : "rgba(255,255,255,0.04)" }}>
                      {i < 3 ? MEDALS[i] : <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.rank}</span>}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: `linear-gradient(135deg,${VIOLET},${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
                      {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{(p.total_points || 0).toLocaleString()} pts</p>
                    </div>
                    <span style={{ fontFamily: "Orbitron,sans-serif", fontSize: 12, fontWeight: 700, color: CYAN }}>{p.wins}W</span>
                  </motion.div>
                );
              })}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <Link to="/leaderboard" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 700, color: CYAN, textDecoration: "none" }}>Classement complet →</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
