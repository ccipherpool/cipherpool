import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Theme ─────────────────────────────────────────────────────── */
const P = "#6366f1", CYAN = "#00d4ff", GREEN = "#10b981", AMBER = "#fbbf24";
const RED = "#f43f5e", VIOLET = "#a78bfa", ORANGE = "#f97316";
const CARD = "rgba(10,10,26,0.95)";
const B = (c, a) => `rgba(${c},${a})`;

/* ── Role metadata ──────────────────────────────────────────────── */
const ROLES_META = {
  super_admin: {
    color: CYAN,
    icon: "👑",
    label: "SUPER ADMIN",
    perms: ["Accès total", "Gestion système", "Toutes permissions", "Modifier rôles"],
    risk: "HAUT",
    riskColor: RED,
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.25)",
  },
  admin: {
    color: "#818cf8",
    icon: "🛡️",
    label: "ADMIN",
    perms: ["Modération users", "Support tickets", "Résoudre rapports", "Modérer tournois", "Octroyer coins"],
    risk: "MOYEN",
    riskColor: AMBER,
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.25)",
  },
  founder: {
    color: VIOLET,
    icon: "⚔️",
    label: "FONDATEUR",
    perms: ["Créer tournois", "Gérer ses tournois", "Lancer matchs", "Voir utilisateurs"],
    risk: "FAIBLE",
    riskColor: GREEN,
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.25)",
  },
  designer: {
    color: ORANGE,
    icon: "🎨",
    label: "DESIGNER",
    perms: ["Gérer store", "Upload assets", "Gérer bannières"],
    risk: "MINIMAL",
    riskColor: "#94a3b8",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.25)",
  },
};

const ALL_STAFF_ROLES = ["super_admin", "admin", "founder", "designer"];

/* ── Staff Card ─────────────────────────────────────────────────── */
function StaffCard({ member, meta, onChangeRole, onRemove, currentUserRole }) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const name = member.full_name || member.username || member.email?.split("@")[0] || "—";
  const joinDate = member.created_at ? new Date(member.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const canModify = currentUserRole === "super_admin" && member.role !== "super_admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? meta.bg : CARD,
        border: `1px solid ${hover ? meta.border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all .22s",
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`, opacity: hover ? 1 : 0.3, transition: "opacity .22s" }} />

      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {/* Avatar */}
          <div style={{ width: 48, height: 48, borderRadius: 14, background: meta.bg, border: `2px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: hover ? `0 0 20px ${meta.color}25` : "none", transition: "box-shadow .22s" }}>
            {member.avatar_url
              ? <img src={member.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : <span>{meta.icon}</span>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, margin: 0 }}>{name}</p>
              <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 1.5, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: "2px 10px", borderRadius: 20 }}>
                {meta.icon} {meta.label}
              </span>
              <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: meta.riskColor, background: `${meta.riskColor}15`, border: `1px solid ${meta.riskColor}30`, padding: "2px 8px", borderRadius: 20 }}>
                RISK: {meta.risk}
              </span>
            </div>
            <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{member.email}</p>
            <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", margin: "4px 0 0", letterSpacing: 1 }}>
              Membre depuis {joinDate} · FF ID: {member.free_fire_id || "—"}
            </p>
          </div>

          {/* Actions */}
          {canModify && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setExpanded(e => !e)}
                style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "JetBrains Mono,monospace", cursor: "pointer", letterSpacing: 1 }}>
                ⚙️ GÉRER
              </motion.button>
            </div>
          )}
        </div>

        {/* Permissions preview */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {meta.perms.map(p => (
            <span key={p} style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5 }}>
              ✓ {p}
            </span>
          ))}
        </div>

        {/* Expanded actions */}
        <AnimatePresence>
          {expanded && canModify && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <p style={{ width: "100%", fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>CHANGER LE RÔLE :</p>
                {ALL_STAFF_ROLES.filter(r => r !== member.role && r !== "super_admin").map(role => {
                  const rm = ROLES_META[role];
                  return (
                    <motion.button key={role} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => { onChangeRole(member.id, role); setExpanded(false); }}
                      style={{ padding: "8px 16px", borderRadius: 10, background: rm.bg, border: `1px solid ${rm.border}`, color: rm.color, fontSize: 11, fontFamily: "JetBrains Mono,monospace", cursor: "pointer", letterSpacing: 1 }}>
                      {rm.icon} Passer {rm.label}
                    </motion.button>
                  );
                })}
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => { if (window.confirm(`Rétrograder ${name} en utilisateur normal ?`)) { onChangeRole(member.id, "user"); setExpanded(false); } }}
                  style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: RED, fontSize: 11, fontFamily: "JetBrains Mono,monospace", cursor: "pointer", letterSpacing: 1 }}>
                  ⬇️ RÉTROGRADER
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Summary cards per role ──────────────────────────────────────── */
function RoleSummaryCard({ role, meta, count, active, onClick }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{ padding: "18px 20px", borderRadius: 14, background: active ? meta.bg : "rgba(10,10,26,0.6)", border: `1px solid ${active ? meta.border : "rgba(255,255,255,0.07)"}`, cursor: "pointer", textAlign: "center", transition: "all .18s", boxShadow: active ? `0 0 28px ${meta.color}15` : "none" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{meta.icon}</div>
      <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 2, color: active ? meta.color : "rgba(255,255,255,0.3)", marginBottom: 4 }}>{meta.label}</p>
      <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color: active ? meta.color : "#fff", lineHeight: 1, textShadow: active ? `0 0 20px ${meta.color}40` : "none" }}>{count}</p>
    </motion.div>
  );
}

/* ── Main StaffTab ───────────────────────────────────────────────── */
export default function StaffTab({ users, updateUserRole, currentUserRole }) {
  const [filter, setFilter] = useState("all");

  const STAFF_ROLES = ["super_admin", "admin", "founder", "designer"];
  const allStaff = users.filter(u => STAFF_ROLES.includes(u.role));
  const displayedStaff = filter === "all" ? allStaff : allStaff.filter(u => u.role === filter);

  const countByRole = role => allStaff.filter(u => u.role === role).length;

  return (
    <motion.div key="staff" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>SUPER ADMIN · GESTION</p>
        <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, letterSpacing: 2, color: "#fff", margin: 0 }}>
          STAFF MANAGEMENT
        </h2>
        <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          {allStaff.length} membres du staff · Rôles, permissions et actions
        </p>
      </div>

      {/* Role summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setFilter("all")}
          style={{ padding: "18px 20px", borderRadius: 14, background: filter === "all" ? "rgba(99,102,241,0.1)" : "rgba(10,10,26,0.6)", border: `1px solid ${filter === "all" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", textAlign: "center", transition: "all .18s" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 2, color: filter === "all" ? "#818cf8" : "rgba(255,255,255,0.3)", marginBottom: 4 }}>TOUS</p>
          <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color: filter === "all" ? "#818cf8" : "#fff", lineHeight: 1 }}>{allStaff.length}</p>
        </motion.div>
        {STAFF_ROLES.map(role => (
          <RoleSummaryCard
            key={role}
            role={role}
            meta={ROLES_META[role]}
            count={countByRole(role)}
            active={filter === role}
            onClick={() => setFilter(role)}
          />
        ))}
      </div>

      {/* Permissions matrix */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ marginBottom: 24, padding: "20px 22px", borderRadius: 16, background: CARD, border: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 2.5, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>MATRICE DES PERMISSIONS</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {STAFF_ROLES.map(role => {
            const meta = ROLES_META[role];
            return (
              <div key={role} style={{ padding: "14px 16px", borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 1.5, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                </div>
                {meta.perms.map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ color: GREEN, fontSize: 10 }}>✓</span>
                    <span style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{p}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Staff list */}
      {displayedStaff.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>👥</div>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 4, color: "rgba(255,255,255,0.2)" }}>AUCUN MEMBRE DANS CETTE CATÉGORIE</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayedStaff.map((member, i) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <StaffCard
                member={member}
                meta={ROLES_META[member.role] || ROLES_META.admin}
                onChangeRole={updateUserRole}
                currentUserRole={currentUserRole}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
