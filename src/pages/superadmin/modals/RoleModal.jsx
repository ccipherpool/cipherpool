import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
  { value: "user",        icon: "👤", label: "UTILISATEUR",  color: "#6b7280", desc: "Joueur normal" },
  { value: "founder",     icon: "⚡", label: "FONDATEUR",    color: "#f59e0b", desc: "Crée tournois" },
  { value: "designer",    icon: "🎨", label: "DESIGNER",     color: "#ec4899", desc: "Gère le store" },
  { value: "admin",       icon: "🛡️", label: "ADMIN",        color: "#06b6d4", desc: "Modération" },
  { value: "super_admin", icon: "👑", label: "SUPER ADMIN",  color: "#f59e0b", desc: "Accès complet" },
  { value: "banned",      icon: "🚫", label: "BANNI",        color: "#ef4444", desc: "Accès bloqué" },
];

export default function RoleModal({ selectedUser, updateUserRole, onClose }) {
  const [newRole, setNewRole] = useState(selectedUser?.role || "user");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            background: "#0a0a1a", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(124,58,237,0.25)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👑</div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Orbitron,sans-serif", letterSpacing: 1 }}>CHANGER LE RÔLE</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                {selectedUser?.username || selectedUser?.display_name || selectedUser?.email}
              </p>
            </div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>RÔLE ACTUEL</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", letterSpacing: 1 }}>{selectedUser?.role?.toUpperCase()}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {ROLES.map(r => (
              <div
                key={r.value}
                onClick={() => setNewRole(r.value)}
                style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${newRole === r.value ? r.color : "rgba(255,255,255,0.07)"}`,
                  background: newRole === r.value ? `${r.color}18` : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: newRole === r.value ? r.color : "rgba(255,255,255,0.6)", fontFamily: "Orbitron,sans-serif" }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{r.desc}</div>
                </div>
                {newRole === r.value && (
                  <div style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%", background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", fontWeight: 700 }}>✓</div>
                )}
              </div>
            ))}
          </div>

          {newRole === "super_admin" && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 12, color: "#f59e0b" }}>
              ⚠️ Ce rôle donne accès à TOUTES les fonctionnalités. Accordez-le avec précaution.
            </div>
          )}
          {newRole === "banned" && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, color: "#ef4444" }}>
              🚫 Ce joueur sera immédiatement déconnecté et ne pourra plus accéder à la plateforme.
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, fontFamily: "Rajdhani,sans-serif" }}
            >
              ANNULER
            </button>
            <button
              onClick={() => updateUserRole(selectedUser.id, newRole)}
              style={{
                flex: 2, padding: "12px", borderRadius: 10, cursor: "pointer",
                background: newRole === "banned" ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#7c3aed,#06b6d4)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 1,
                fontFamily: "Orbitron,sans-serif", boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
              }}
            >
              ✓ CONFIRMER → {newRole.toUpperCase().replace("_", " ")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
