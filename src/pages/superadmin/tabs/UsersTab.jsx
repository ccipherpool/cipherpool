import { motion } from "framer-motion";
import {
  ShieldAlert, Wallet, Ban, Trash2, CheckCircle2,
  Search, User, Crown, Hash, MapPin, Calendar,
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
  cyan:     "#06B6D4",
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

const countryFlag = (code) => {
  if (!code || code.length !== 2) return null;
  return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { color: C.text3, bg: "rgba(82,82,91,0.15)", label: "User" };
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
  width: 32, height: 32,
  borderRadius: 9, border: `1px solid ${C.border}`,
  background: C.surface3, color: C.text2, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s", flexShrink: 0,
});

function ActionButtons({ user, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      <button style={btnStyle(C.orange)} title="Change role"
        onMouseEnter={e => { e.currentTarget.style.background = `${C.orange}18`; e.currentTarget.style.color = C.orange; e.currentTarget.style.borderColor = `${C.orange}40`; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}>
        <Crown size={13} />
      </button>
      <button style={btnStyle(C.green)} title="Manage wallet"
        onMouseEnter={e => { e.currentTarget.style.background = `${C.green}18`; e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = `${C.green}40`; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}>
        <Wallet size={13} />
      </button>
      {user.role !== "banned" ? (
        <button style={btnStyle(C.red)} title="Ban"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.red}18`; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}>
          <Ban size={13} />
        </button>
      ) : (
        <button style={btnStyle(C.green)} title="Unban"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.green}18`; e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = `${C.green}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => unbanUser(user.id)}>
          <CheckCircle2 size={13} />
        </button>
      )}
      {user.role !== "super_admin" && (
        <button style={btnStyle(C.red)} title="Delete"
          onMouseEnter={e => { e.currentTarget.style.background = `${C.red}18`; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
          onClick={() => deleteUser(user.id)}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export default function UsersTab({ filteredUsers, search, setSearch, filter, setFilter, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  const actionProps = { setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser };
  const displayed = filteredUsers.slice(0, 50);

  const FILTERS = [
    { value: "all",      label: "All" },
    { value: "admins",   label: "Admins" },
    { value: "founders", label: "Founders" },
    { value: "banned",   label: "Banned" },
    { value: "pending",  label: "Pending" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: C.font }}
    >
      {/* Search + filter bar */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "14px 18px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search by name, email, FF UID, country, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 36px",
                background: C.surface3, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text, fontSize: 13,
                outline: "none", fontFamily: C.font, boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = `${C.purple}60`}
              onBlur={e  => e.target.style.borderColor = C.border}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
        {/* Search hints */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { icon: Hash,    color: C.amber, label: "Search by UID" },
            { icon: MapPin,  color: C.cyan,  label: "Search by country/city" },
            { icon: Calendar,color: C.purple,label: "Filter by role above" },
          ].map(({ icon: Icon, color, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.text3 }}>
              <Icon size={11} style={{ color }} /> {label}
            </span>
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
          display: "grid",
          gridTemplateColumns: "minmax(200px,2fr) 100px 130px 90px 80px 110px 140px",
          padding: "10px 18px",
          borderBottom: `1px solid ${C.border}`,
          background: C.surface3,
          gap: 8,
        }}>
          {["Player", "Role", "Wallet", "UID", "Age", "WhatsApp", "Actions"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: 0.8, textTransform: "uppercase", textAlign: i === 6 ? "right" : "left" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {displayed.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <User size={36} style={{ color: C.text3, marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: C.text3 }}>No users found</p>
          </div>
        ) : (
          displayed.map((user, i) => {
            const ffUID = user.free_fire_uid || user.free_fire_id;
            const flag  = countryFlag(user.country);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.018 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,2fr) 100px 130px 90px 80px 110px 140px",
                  padding: "10px 18px", alignItems: "center", gap: 8,
                  borderBottom: i < displayed.length - 1 ? `1px solid ${C.border}` : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface3}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Player */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: user.avatar_url ? "transparent" : `${C.purple}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>{(user.display_name || "?")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.display_name}
                    </p>
                    <p style={{ fontSize: 11, color: C.text3, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </p>
                    {(user.country || user.city) && (
                      <p style={{ fontSize: 10, color: C.text3, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        {flag && <span style={{ fontSize: 12 }}>{flag}</span>}
                        {user.city ? `${user.city}, ${user.country || ""}` : user.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div><RoleBadge role={user.role} /></div>

                {/* Wallet */}
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                    {(user.coins || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 11, color: C.text3 }}> CP</span>
                </div>

                {/* FF UID */}
                <div>
                  {ffUID ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.cyan, fontWeight: 600, fontFamily: "monospace" }}>
                      <Hash size={10} style={{ flexShrink: 0 }} />{ffUID}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: C.text3 }}>—</span>
                  )}
                </div>

                {/* Age */}
                <div>
                  {user.age ? (
                    <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{user.age}y</span>
                  ) : (
                    <span style={{ fontSize: 11, color: C.text3 }}>—</span>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  {user.whatsapp_verified ? (
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.green, background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 20, padding: "2px 8px" }}>
                        ✅ Verified
                      </span>
                      {user.whatsapp_phone && (
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 3, fontFamily: "monospace" }}>{user.whatsapp_phone}</div>
                      )}
                    </div>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: C.text3, background: "rgba(82,82,91,0.15)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 8px" }}>
                      ⏳ Pending
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <ActionButtons user={user} {...actionProps} />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {filteredUsers.length > 50 && (
        <p style={{ fontSize: 12, color: C.text3, textAlign: "center" }}>
          Showing first 50 of {filteredUsers.length} results
        </p>
      )}
    </motion.div>
  );
}
