import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function DeleteUserModal({ user, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");

  const targetName = user?.display_name || user?.username || user?.full_name || "this user";
  const confirmed  = confirm.trim().toLowerCase() === "delete";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, background: "#0d1320",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 18, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid rgba(239,68,68,0.15)",
          background: "rgba(239,68,68,0.06)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trash2 size={15} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Delete Account</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>This action is permanent and irreversible</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Warning */}
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginBottom: 16,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                Deleting <strong style={{ color: "#fff" }}>{targetName}</strong> will:
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li>Immediately revoke all active sessions</li>
                  <li>Force logout from all devices</li>
                  <li>Archive their data to deleted_accounts</li>
                  <li>Block future login with the same email</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
              Deletion Reason
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for deleting this account…"
              rows={2}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, color: "#fff", fontSize: 12, padding: "9px 11px",
                outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
              }}
            />
          </div>

          {/* Type confirm */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
              Type <span style={{ color: "#ef4444", fontFamily: "monospace" }}>delete</span> to confirm
            </label>
            <input
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="delete"
              autoFocus
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: `1px solid ${confirmed ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, color: "#fff", fontSize: 13, padding: "9px 11px",
                outline: "none", boxSizing: "border-box", fontFamily: "monospace",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "11px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}>
              Cancel
            </button>
            <button
              onClick={() => confirmed && !loading && onConfirm(reason)}
              disabled={!confirmed || loading}
              style={{
                flex: 1, padding: "11px", borderRadius: 9, border: "none", cursor: confirmed && !loading ? "pointer" : "not-allowed",
                background: confirmed ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "rgba(239,68,68,0.12)",
                color: confirmed ? "#fff" : "rgba(239,68,68,0.4)",
                fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
                boxShadow: confirmed ? "0 4px 16px rgba(239,68,68,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              {loading ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
