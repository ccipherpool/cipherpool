import { motion } from "framer-motion";
import {
  ShieldAlert, Wallet, Ban, Trash2, CheckCircle2,
  Search, Filter, User, Crown, Zap, Layout, Activity,
} from "lucide-react";

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
  orange:   "#F97316",
  pink:     "#EC4899",
  text:     "#FFFFFF",
  text2:    "#A1A1AA",
  text3:    "#52525B",
  font:     "Inter, system-ui, sans-serif",
};

const ROLE_STYLE = {
  super_admin: { color: C.red,    bg: `${C.red}18`,    label: "Super Admin" },
  admin:       { color: C.orange, bg: `${C.orange}18`, label: "Admin" },
  designer:    { color: C.blue,   bg: `${C.blue}18`,   label: "Designer" },
  founder:     { color: C.purple, bg: `${C.purple}18`, label: "Founder" },
  fondateur:   { color: C.purple, bg: `${C.purple}18`, label: "Founder" },
  banned:      { color: C.text3,  bg: "rgba(82,82,91,0.2)", label: "Banni" },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { color: C.text3, bg: "rgba(82,82,91,0.15)", label: "Utilisateur" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

const btnStyle = (color) => ({
  width: 34, height: 34,
  borderRadius: 10, border: `1px solid ${C.border}`,
  background: C.surface3, color: C.text2, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s",
  flexShrink: 0,
});

function ActionButtons({ user, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button style={btnStyle(C.orange)} title="Modifier rôle"
        onMouseEnter={e => { e.currentTarget.style.background = `${C.orange}18`; e.currentTarget.style.color = C.orange; e.currentTarget.style.borderColor = `${C.orange}40`; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}>
        <Crown size={15} />
      </button>
      <button style={btnStyle(C.green)} title="Gérer wallet"
        onMouseEnter={e => { e.currentTarget.style.background = `${C.green}18`; e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = `${C.green}40`; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}>
        <Wallet size={15} />
      </button>
      {user.role !== "banned" ? (
        <button style={btnStyle(C.red)} title="Bannir"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.red}18`; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}>
          <Ban size={15} />
        </button>
      ) : (
        <button style={btnStyle(C.green)} title="Débannir"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.green}18`; e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = `${C.green}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => unbanUser(user.id)}>
          <CheckCircle2 size={15} />
        </button>
      )}
      {user.role !== "super_admin" && (
        <button style={btnStyle(C.red)} title="Supprimer"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.red}18`; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => deleteUser(user.id)}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

export default function UsersTab({ filteredUsers, search, setSearch, filter, setFilter, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  const actionProps = { setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser };
  const displayed = filteredUsers.slice(0, 50);

  const FILTERS = [
    { value: "all",      label: "Tous" },
    { value: "admins",   label: "Admins" },
    { value: "founders", label: "Founders" },
    { value: "banned",   label: "Bannis" },
    { value: "pending",  label: "En attente" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: C.font }}
    >
      {/* Search + filter bar */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "14px 18px",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou ID Free Fire..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px 9px 36px",
              background: C.surface3, border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.text, fontSize: 13,
              outline: "none", fontFamily: C.font, boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = `${C.purple}60`}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${filter === f.value ? C.purple + "60" : C.border}`,
                background: filter === f.value ? `${C.purple}18` : "transparent",
                color: filter === f.value ? C.purple : C.text2,
                transition: "all 0.15s",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${C.border}`,
        borderRadius: 16, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 120px 140px 160px",
          padding: "12px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: C.surface3,
        }}>
          {["Utilisateur", "Rôle", "Wallet", "Actions"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: 1, textAlign: i === 3 ? "right" : "left" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {displayed.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <User size={40} style={{ color: C.text3, marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: C.text3 }}>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          displayed.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              style={{
                display: "grid", gridTemplateColumns: "2fr 120px 140px 160px",
                padding: "12px 20px", alignItems: "center",
                borderBottom: i < displayed.length - 1 ? `1px solid ${C.border}` : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface3}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* User */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: user.avatar_url ? "transparent" : `${C.purple}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 14, fontWeight: 800, color: C.purple }}>{(user.display_name || "?")[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.display_name}
                  </p>
                  <p style={{ fontSize: 11, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </p>
                </div>
              </div>
              {/* Role */}
              <div><RoleBadge role={user.role} /></div>
              {/* Coins */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                  {(user.coins || 0).toLocaleString()}
                </span>
                <span style={{ fontSize: 11, color: C.text3 }}> CP</span>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ActionButtons user={user} {...actionProps} />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {filteredUsers.length > 50 && (
        <p style={{ fontSize: 12, color: C.text3, textAlign: "center" }}>
          Affichage des 50 premiers résultats sur {filteredUsers.length}
        </p>
      )}
    </motion.div>
  );
}
