import { motion, AnimatePresence } from "framer-motion";

export default function WalletModal({ users, selectedUser, setSelectedUser, walletSearch, setWalletSearch, grantAmount, setGrantAmount, grantReason, setGrantReason, grantCoins, onClose }) {
  const parsedAmount = parseInt(grantAmount) || 0;
  const isNeg = parsedAmount < 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          style={{
            background: "#0a0a1a", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 500,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(245,158,11,0.2)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💰</div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Orbitron,sans-serif", letterSpacing: 1 }}>GESTION DES PIÈCES</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                {selectedUser ? (selectedUser.display_name || selectedUser.username || selectedUser.email) : "Sélectionne un joueur"}
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              🔍 RECHERCHER UN JOUEUR
            </label>
            <input
              placeholder="Nom, username ou email..."
              value={walletSearch}
              onChange={e => setWalletSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 13, fontFamily: "Rajdhani,sans-serif", outline: "none" }}
            />
            {walletSearch.length > 0 && (
              <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", maxHeight: 200, overflowY: "auto" }}>
                {users.filter(u =>
                  u.display_name?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                  u.username?.toLowerCase().includes(walletSearch.toLowerCase())
                ).slice(0, 8).map(u => (
                  <div
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setWalletSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selectedUser?.id === u.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
                    onMouseOut={e => e.currentTarget.style.background = selectedUser?.id === u.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)"}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                      {(u.display_name || u.email || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{u.display_name || u.username || "Inconnu"}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{u.email} · 💰 {(u.coins || 0).toLocaleString()}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 99, background: u.role === "super_admin" ? "rgba(245,158,11,0.15)" : "rgba(124,58,237,0.15)", color: u.role === "super_admin" ? "#f59e0b" : "#a855f7" }}>
                      {u.role?.toUpperCase()}
                    </span>
                  </div>
                ))}
                {users.filter(u =>
                  u.display_name?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                  u.username?.toLowerCase().includes(walletSearch.toLowerCase())
                ).length === 0 && (
                  <div style={{ padding: "12px 14px", color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center" }}>Aucun joueur trouvé</div>
                )}
              </div>
            )}
          </div>

          {/* Selected user badge */}
          {selectedUser && (
            <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  {(selectedUser.display_name || selectedUser.email || "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{selectedUser.display_name || selectedUser.username || "Inconnu"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{selectedUser.email}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>SOLDE ACTUEL</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", fontFamily: "Orbitron,sans-serif" }}>💰 {(selectedUser.coins || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Add / Remove toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[
              { label: "➕ AJOUTER", isAdd: true,  color: "#10b981" },
              { label: "➖ RETIRER", isAdd: false, color: "#ef4444" },
            ].map(opt => {
              const currentIsAdd = parsedAmount >= 0;
              const active = opt.isAdd ? currentIsAdd : !currentIsAdd;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    const abs = Math.abs(parseInt(grantAmount) || 0);
                    setGrantAmount(opt.isAdd ? abs || "" : abs ? String(-abs) : "");
                  }}
                  style={{
                    padding: "11px", borderRadius: 10, cursor: "pointer",
                    background: active ? opt.color + "25" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? opt.color + "60" : "rgba(255,255,255,0.08)"}`,
                    color: active ? opt.color : "rgba(255,255,255,0.4)",
                    fontSize: 12, fontWeight: 700, letterSpacing: 1,
                    fontFamily: "Rajdhani,sans-serif", transition: "all 0.2s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>MONTANT *</label>
            <input
              type="number"
              placeholder="Ex: 500"
              value={grantAmount === "" ? "" : Math.abs(parseInt(grantAmount) || 0) || ""}
              onChange={e => {
                const abs = Math.abs(parseInt(e.target.value) || 0);
                const neg = (parseInt(grantAmount) || 0) < 0;
                setGrantAmount(abs ? (neg ? String(-abs) : abs) : "");
              }}
              style={{ width: "100%", padding: "11px 14px", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 16, fontFamily: "Orbitron,sans-serif", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[100, 500, 1000, 2000, 5000].map(n => (
                <button key={n}
                  onClick={() => { const neg = (parseInt(grantAmount) || 0) < 0; setGrantAmount(neg ? -n : n); }}
                  style={{ padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontFamily: "Rajdhani,sans-serif", fontWeight: 600 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>RAISON * (obligatoire)</label>
            <input
              type="text"
              placeholder="Ex: Récompense tournoi, Bug fix, Pénalité..."
              value={grantReason}
              onChange={e => setGrantReason(e.target.value)}
              style={{ width: "100%", padding: "11px 14px", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, fontFamily: "Rajdhani,sans-serif", outline: "none" }}
            />
          </div>

          {/* Preview */}
          {selectedUser && grantAmount !== "" && parsedAmount !== 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>SOLDE APRÈS</span>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "Orbitron,sans-serif", color: ((selectedUser.coins || 0) + parsedAmount) < 0 ? "#ef4444" : "#10b981" }}>
                💰 {Math.max(0, (selectedUser.coins || 0) + parsedAmount).toLocaleString()}
              </span>
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
              onClick={grantCoins}
              disabled={!selectedUser || !grantAmount || !grantReason.trim()}
              style={{
                flex: 2, padding: "12px", borderRadius: 10,
                cursor: (!selectedUser || !grantAmount || !grantReason.trim()) ? "not-allowed" : "pointer",
                border: "none",
                background: (!selectedUser || !grantAmount || !grantReason.trim())
                  ? "rgba(255,255,255,0.05)"
                  : isNeg
                    ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                color: (!selectedUser || !grantAmount || !grantReason.trim()) ? "rgba(255,255,255,0.2)" : "#fff",
                fontSize: 13, fontWeight: 700, letterSpacing: 1,
                fontFamily: "Orbitron,sans-serif", transition: "all 0.2s",
              }}
            >
              {!selectedUser ? "👤 CHOISIR UN JOUEUR" :
               !grantAmount ? "ENTRER UN MONTANT" :
               isNeg ? `🔴 RETIRER ${Math.abs(parsedAmount)} PIÈCES` : `✅ AJOUTER ${parsedAmount} PIÈCES`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
