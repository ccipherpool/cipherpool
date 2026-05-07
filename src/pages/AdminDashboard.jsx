import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";
const AMBER  = "#f59e0b";

const cx = a => `rgba(0,212,255,${a})`;
const vx = a => `rgba(139,92,246,${a})`;

const STATUS_MAP = {
  active:    { label: "EN COURS", color: CYAN,   bg: cx(0.1)  },
  upcoming:  { label: "À VENIR",  color: ORANGE, bg: "rgba(249,115,22,0.1)" },
  completed: { label: "TERMINÉ",  color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)" },
};

const ROLE_MAP = {
  admin:       { label: "Admin",  color: ORANGE },
  super_admin: { label: "S.Admin",color: CYAN   },
  moderator:   { label: "Modo",   color: VIOLET },
  user:        { label: "User",   color: VIOLET },
};

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function StatCard({ icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px 22px", background: "#050c1f", border: `1px solid rgba(255,255,255,0.07)`, borderTop: `2px solid ${color}` }}
    >
      <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle,${color}18,transparent)`, pointerEvents: "none" }} />
      <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.6 }}>{icon}</div>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2.5, color: "rgba(255,255,255,0.25)", marginBottom: 7 }}>{label}</p>
      <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 24px ${color}40` }}>{value}</p>
    </motion.div>
  );
}

function QuickLink({ to, icon, label, color }) {
  const [h, setH] = useState(false);
  return (
    <Link to={to} style={{ textDecoration: "none" }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, transition: "all 0.2s", background: h ? `${color}10` : "rgba(255,255,255,0.03)", border: `1px solid ${h ? color + "35" : "rgba(255,255,255,0.07)"}` }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}25` }}>{icon}</div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: h ? "#fff" : "rgba(255,255,255,0.65)", flex: 1, transition: "color 0.2s" }}>{label}</span>
        <span style={{ fontSize: 12, color: h ? color : "rgba(255,255,255,0.2)", transition: "color 0.2s" }}>→</span>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]               = useState({ totalUsers: 0, verifiedUsers: 0, totalCoins: 0, totalTournaments: 0 });
  const [recentUsers, setRecentUsers]   = useState([]);
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        { count: usersCount },
        { count: verifiedCount },
        { count: tournamentsCount },
        { data: walletSum },
        { data: recentT },
        { data: recentU },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("wallets").select("balance"),
        supabase.from("tournaments").select("id,name,status,prize_coins,current_players,max_players,created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("id,full_name,email,role,created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalCoins = (walletSum || []).reduce((s, w) => s + (w.balance || 0), 0);

      setStats({
        totalUsers:       usersCount || 0,
        verifiedUsers:    verifiedCount || 0,
        totalCoins,
        totalTournaments: tournamentsCount || 0,
      });
      setRecentTournaments(recentT || []);
      setRecentUsers(recentU || []);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 36, height: 36, border: `2px solid ${cx(0.12)}`, borderTopColor: CYAN, borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
        .adm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .adm-main  { display:grid; grid-template-columns:1fr 280px; gap:14px; align-items:start; }
        .adm-trow:hover { background:rgba(0,212,255,0.03) !important; }
        @media(max-width:1024px) { .adm-main{grid-template-columns:1fr} }
        @media(max-width:768px)  { .adm-stats{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,0.88)" }}>

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ position: "relative", overflow: "hidden", padding: "26px 28px", borderRadius: 16, marginBottom: 22, background: "#050c1f", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${VIOLET},${CYAN},transparent)` }} />
          {/* BG glow */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${vx(0.08)},transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, position: "relative" }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 4, color: VIOLET, marginBottom: 8 }}>🛡️ PANNEAU D'ADMINISTRATION</p>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 2, margin: 0, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, backgroundSize: "200% 200%", animation: "flow 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ADMIN PANEL
              </h1>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                Gérez la plateforme CipherPool — accès restreint
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, animation: "pulse-dot 2s ease infinite", display: "inline-block", boxShadow: `0 0 10px rgba(16,185,129,0.7)` }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: 2 }}>LIVE</span>
            </div>
          </div>
        </motion.div>

        {/* ── STATS ── */}
        <div className="adm-stats" style={{ marginBottom: 22 }}>
          <StatCard icon="👥" label="UTILISATEURS"  value={stats.totalUsers}       color={VIOLET} delay={0.05} />
          <StatCard icon="✅" label="VÉRIFIÉS"       value={stats.verifiedUsers}    color={GREEN}  delay={0.10} />
          <StatCard icon="🏆" label="TOURNOIS"       value={stats.totalTournaments} color={CYAN}   delay={0.15} />
          <StatCard icon="💰" label="COINS TOTAL"    value={stats.totalCoins.toLocaleString("fr-FR")} color={ORANGE} delay={0.20} />
        </div>

        {/* ── MAIN GRID ── */}
        <div className="adm-main" style={{ marginBottom: 22 }}>

          {/* Left — Tournois récents */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            style={{ borderRadius: 14, overflow: "hidden", background: "#050c1f", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>🏆</span>
                <h2 style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.5)", margin: 0 }}>TOURNOIS RÉCENTS</h2>
              </div>
              <Link to="/create-tournament" style={{ textDecoration: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: "6px 12px", borderRadius: 8, background: vx(0.12), border: `1px solid ${vx(0.3)}`, color: VIOLET }}>
                + CRÉER
              </Link>
            </div>

            {recentTournaments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>Aucun tournoi créé</div>
            ) : (
              <div>
                {recentTournaments.map((t, i) => {
                  const s = STATUS_MAP[t.status] || STATUS_MAP.upcoming;
                  return (
                    <Link key={t.id} to={`/tournaments/${t.id}`} style={{ textDecoration: "none" }}>
                      <div
                        className="adm-trow"
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 22px", borderBottom: i < recentTournaments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s", cursor: "pointer" }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: cx(0.07), border: `1px solid ${cx(0.12)}` }}>🏆</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: ORANGE }}>{(t.prize_coins || 0).toLocaleString()} CP</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{t.current_players || 0}/{t.max_players || 0}</span>
                          </div>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, padding: "4px 9px", borderRadius: 99, color: s.color, background: s.bg, flexShrink: 0 }}>{s.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Right — Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            style={{ borderRadius: 14, overflow: "hidden", background: "#050c1f", border: "1px solid rgba(255,255,255,0.07)", padding: "18px 22px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <h2 style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.5)", margin: 0 }}>ACTIONS RAPIDES</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <QuickLink to="/admin/support"         icon="🛡️" label="Support"         color={CYAN}   />
              <QuickLink to="/admin/results"          icon="📊" label="Résultats"        color={VIOLET} />
              <QuickLink to="/admin/news"             icon="📰" label="Actualités"       color={AMBER}  />
              <QuickLink to="/admin-store"            icon="🛒" label="Store Admin"      color={ORANGE} />
              <QuickLink to="/create-tournament"      icon="🏆" label="Créer Tournoi"    color={GREEN}  />
            </div>
          </motion.div>
        </div>

        {/* ── USERS TABLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ borderRadius: 14, overflow: "hidden", background: "#050c1f", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>👥</span>
            <h2 style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.5)", margin: 0 }}>UTILISATEURS RÉCENTS</h2>
            <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, padding: "4px 10px", borderRadius: 99, background: vx(0.1), color: VIOLET, border: `1px solid ${vx(0.25)}` }}>10 DERNIERS</span>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>Aucun utilisateur</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {["UTILISATEUR", "RÔLE", "INSCRIPTION"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 22px", fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user, i) => {
                    const rm = ROLE_MAP[user.role] || ROLE_MAP.user;
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 + 0.32 }}
                        className="adm-trow"
                        style={{ borderBottom: i < recentUsers.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", transition: "background 0.15s" }}
                      >
                        <td style={{ padding: "12px 22px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
                              {getInitials(user.full_name || user.email)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name || "—"}</p>
                              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 22px" }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: "4px 10px", borderRadius: 99, color: rm.color, background: `${rm.color}15`, border: `1px solid ${rm.color}28` }}>{rm.label.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "12px 22px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                          {formatDate(user.created_at)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
