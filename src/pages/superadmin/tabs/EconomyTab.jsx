import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, BarChart3, PlusCircle, Download } from "lucide-react";

const C = {
  surface:  "rgba(18,18,30,0.95)",
  surface2: "rgba(25,25,40,0.95)",
  surface3: "rgba(32,32,48,0.90)",
  border:   "rgba(255,255,255,0.07)",
  purple:   "#8B5CF6",
  green:    "#10B981",
  red:      "#EF4444",
  amber:    "#F59E0B",
  blue:     "#3B82F6",
  cyan:     "#06B6D4",
  text:     "#FFFFFF",
  text2:    "#A1A1AA",
  text3:    "#52525B",
  font:     "Inter, system-ui, sans-serif",
};

function StatCard({ icon: Icon, color, label, value, unit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${color}25`,
        borderRadius: 20,
        padding: "24px 26px",
        position: "relative",
        overflow: "hidden",
        fontFamily: C.font,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}25`}
    >
      <div style={{ position: "absolute", top: -10, right: -10, opacity: 0.04 }}>
        <Icon size={90} color={color} />
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `radial-gradient(ellipse at bottom, ${color}15 -20%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
          boxShadow: `0 4px 12px ${color}25`,
        }}>
          <Icon size={20} color={color} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 8 }}>
          {label}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: 13, fontWeight: 700, color: C.text3 }}>{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function ActionCard({ icon: Icon, color, title, subtitle, children }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: "26px 28px",
      position: "relative",
      overflow: "hidden",
      fontFamily: C.font,
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      <div style={{ position: "absolute", top: -12, right: -12, opacity: 0.04 }}>
        <Icon size={110} color={color} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
          boxShadow: `0 4px 12px ${color}25`,
        }}>
          <Icon size={20} color={color} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export default function EconomyTab({ stats = {}, setMessage }) {
  const statCards = [
    {
      icon: Wallet,
      color: C.amber,
      label: "CP EN CIRCULATION",
      value: (stats.totalCoins || 0).toLocaleString(),
      unit: "CP",
    },
    {
      icon: TrendingUp,
      color: C.green,
      label: "ENTRÉES AUJOURD'HUI",
      value: `+${stats.todayRevenue || 0}`,
      unit: "CP",
    },
    {
      icon: BarChart3,
      color: C.blue,
      label: "PROJECTION MENSUELLE",
      value: (stats.monthlyRevenue || 0).toLocaleString(),
      unit: "CP",
    },
  ];

  const btnBase = {
    width: "100%",
    padding: "13px 20px",
    borderRadius: 12,
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: C.font,
    transition: "opacity 0.15s",
    letterSpacing: 0.5,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: C.font }}
    >
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {statCards.map((card, i) => (
          <motion.div key={card.label} transition={{ delay: i * 0.05 }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ActionCard
          icon={PlusCircle}
          color={C.purple}
          title="Attribuer des CP"
          subtitle="Modifier directement le solde d'un utilisateur et autoriser des distributions de Cyber Points."
        >
          <Link to="/super-admin/grant" style={{ textDecoration: "none" }}>
            <button
              style={{ ...btnBase, background: C.purple, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <PlusCircle size={16} />
              Attribuer des CP
            </button>
          </Link>
        </ActionCard>

        <ActionCard
          icon={Download}
          color={C.green}
          title="Export audit"
          subtitle="Générer des rapports d'économie pour l'audit des transactions et l'analyse des performances."
        >
          <button
            style={{ ...btnBase, background: `${C.green}18`, color: C.green, border: `1px solid ${C.green}30` }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.green}28`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${C.green}18`; }}
            onClick={() => {
              if (setMessage) {
                setMessage({ type: "success", text: "Export des données d'audit lancé." });
                setTimeout(() => setMessage({ type: "", text: "" }), 3000);
              }
            }}
          >
            <Download size={16} />
            Exporter le journal d'audit
          </button>
        </ActionCard>
      </div>
    </motion.div>
  );
}
