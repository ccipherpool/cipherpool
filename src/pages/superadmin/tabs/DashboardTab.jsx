import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck, AlertCircle, Wallet, Trophy, PlusCircle,
  Activity, Users2, ChevronRight, Clock, History, TrendingUp,
  Zap, CheckCircle,
} from "lucide-react";

const C = {
  surface:  "rgba(18, 18, 30, 0.95)",
  surface2: "rgba(25, 25, 40, 0.95)",
  surface3: "rgba(32, 32, 48, 0.90)",
  border:   "rgba(255,255,255,0.07)",
  purple:   "#8B5CF6",
  cyan:     "#06B6D4",
  green:    "#10B981",
  red:      "#EF4444",
  amber:    "#F59E0B",
  blue:     "#3B82F6",
  pink:     "#EC4899",
  text:     "#FFFFFF",
  text2:    "#A1A1AA",
  text3:    "#52525B",
  font:     "Inter, system-ui, sans-serif",
};

function ActionCard({ icon: Icon, color, bg, title, subtitle, value, label, onClick, to }) {
  const inner = (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${color}25`,
        borderRadius: 20,
        padding: "22px 24px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: C.font,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}25`}
    >
      {/* bg icon */}
      <div style={{ position: "absolute", top: -10, right: -10, opacity: 0.04 }}>
        <Icon size={100} color={color} />
      </div>
      {/* bottom glow */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `radial-gradient(ellipse at bottom, ${color}18 -20%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
          boxShadow: `0 4px 12px ${color}30`,
        }}>
          <Icon size={22} color={color} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.4 }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative", zIndex: 1, marginTop: 20 }}>
        <div>
          <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: 1, marginTop: 4 }}>{label}</p>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}10`,
        }}>
          <ChevronRight size={16} color={color} />
        </div>
      </div>
    </motion.div>
  );

  if (to) return <Link to={to} style={{ textDecoration: "none", display: "block", height: "100%" }}>{inner}</Link>;
  return inner;
}

export default function DashboardTab({ stats, users, logs, setActiveTab, setFilter, setSelectedUser, setGrantAmount, setGrantReason, setWalletSearch, setShowWalletModal }) {
  const todayUsers = users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length;
  const staffCount = users.filter(u => ["admin", "super_admin", "founder", "designer"].includes(u.role)).length;

  const quickStats = [
    { label: "Nouveaux aujourd'hui",  value: `+${todayUsers}`, color: C.green },
    { label: "Membres du staff",       value: staffCount,       color: C.purple },
    { label: "Charge système",         value: "Optimale",       color: C.cyan },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, fontFamily: C.font }}
    >
      {/* ── Left: 4 action cards ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ActionCard
          icon={ShieldCheck}
          color={C.amber}
          bg={`${C.amber}18`}
          title="Vérifications"
          subtitle="Gérer les demandes de vérification d'identité en attente"
          value={stats.pendingVerifications || 0}
          label="EN ATTENTE"
          onClick={() => { setActiveTab("users"); setFilter("pending"); }}
        />
        <ActionCard
          icon={AlertCircle}
          color={C.red}
          bg={`${C.red}18`}
          title="Signalements"
          subtitle="Traiter les signalements et prendre des mesures disciplinaires"
          value={stats.totalReports || 0}
          label="RAPPORTS ACTIFS"
          onClick={() => setActiveTab("reports")}
        />
        <ActionCard
          icon={Wallet}
          color={C.purple}
          bg={`${C.purple}18`}
          title="Économie"
          subtitle="Distribuer des CP et auditer les transactions"
          value={(stats.totalCoins || 0).toLocaleString()}
          label="CP EN CIRCULATION"
          onClick={() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }}
        />
        <ActionCard
          icon={PlusCircle}
          color={C.blue}
          bg={`${C.blue}18`}
          title="Créer un tournoi"
          subtitle="Lancer un nouveau tournoi ou gérer les opérations actives"
          value={stats.activeTournaments || 0}
          label="TOURNOIS ACTIFS"
          to="/create-tournament"
        />
      </div>

      {/* ── Right: stats + logs ───────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Quick stats */}
        <div style={{
          background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
          border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "20px 22px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Activity size={16} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Vue d'ensemble</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {quickStats.map((s, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 0",
                borderBottom: i < quickStats.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <span style={{ fontSize: 12, color: C.text2 }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div style={{
          background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
          border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "20px 22px",
          flex: 1, display: "flex", flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <History size={16} color={C.text3} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Audit récent</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {logs.length === 0 ? (
              <p style={{ fontSize: 12, color: C.text3, textAlign: "center", padding: "24px 0" }}>Aucun log récent</p>
            ) : (
              logs.slice(0, 10).map(log => {
                const actor = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: C.surface3,
                    border: `1px solid ${C.border}`,
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.purple, marginBottom: 4 }}>
                      {log.action}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.text3 }}>
                        {actor?.display_name || actor?.username || actor?.email?.split("@")[0] || "Système"}
                      </span>
                      <span style={{ fontSize: 10, color: C.text3 }}>
                        {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
