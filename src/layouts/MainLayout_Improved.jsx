import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, LogOut, Settings } from "lucide-react";

const NAV_MAIN = [
  { to: "/dashboard", label: "Tableau de bord", icon: "⚡" },
  { to: "/tournaments", label: "Tournois", icon: "🏆" },
  { to: "/leaderboard", label: "Classement", icon: "📊" },
  { to: "/clans", label: "Clans", icon: "⚔️" },
  { to: "/teams", label: "Équipes", icon: "🛡️" },
  { to: "/news", label: "Actualités", icon: "📰" },
  { to: "/chat", label: "Chat global", icon: "💬" },
  { to: "/store", label: "Boutique", icon: "🛍️" },
  { to: "/wallet", label: "Portefeuille", icon: "💎" },
  { to: "/achievements", label: "Achievements", icon: "🏅" },
  { to: "/daily-rewards", label: "Daily Rewards", icon: "🎁" },
  { to: "/stats", label: "Mes Stats", icon: "📈" },
  { to: "/support", label: "Support", icon: "🎧" },
  { to: "/profile", label: "Mon Profil", icon: "👤" },
];

const NAV_ADMIN = [
  { to: "/admin", label: "Administration", icon: "🛡️", roles: ["admin", "super_admin", "fondateur", "founder"] },
  { to: "/admin/news", label: "Actualités", icon: "📰", roles: ["admin", "super_admin", "fondateur", "founder"] },
  { to: "/admin/results", label: "Résultats", icon: "📋", roles: ["admin", "super_admin", "fondateur", "founder"] },
  { to: "/admin-store", label: "Boutique Admin", icon: "🏪", roles: ["admin", "super_admin"] },
  { to: "/designer", label: "Designer", icon: "🎨", roles: ["designer", "admin", "super_admin"] },
  { to: "/founder", label: "Panel Fondateur", icon: "⚡", roles: ["founder", "fondateur", "super_admin"] },
  { to: "/create-tournament", label: "Créer Tournoi", icon: "➕", roles: ["founder", "fondateur", "super_admin"] },
  { to: "/super-admin", label: "Super Admin", icon: "👑", roles: ["super_admin"] },
];

const COLORS = {
  bg: "#0a0a0f",
  sidebar: "#0f0f1a",
  surface: "#14141f",
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  accent: "#8b5cf6",
  accentDark: "#7c3aed",
  text: "#e8e8f4",
  text2: "#9898b8",
  text3: "#5c5c7a",
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data);
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
    if (wallet) setBalance(wallet.balance ?? 0);
  }, []);

  useEffect(() => {
    let walletSub;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [{ data: prof }, { data: wallet }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
      ]);
      setProfile(prof);
      setBalance(wallet?.balance ?? 0);
      setLoading(false);

      walletSub = supabase
        .channel(`wallet-${user.id}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "wallets",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setBalance(payload.new?.balance ?? 0);
        })
        .subscribe();
    };
    init();
    return () => { walletSub?.unsubscribe(); };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const visibleAdmin = NAV_ADMIN.filter(i => i.roles.includes(profile?.role));
  const canAdmin = visibleAdmin.length > 0;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: COLORS.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${COLORS.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: COLORS.text3, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2 }}>CHARGEMENT</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3 }}
        style={{
          height: "100vh",
          background: COLORS.sidebar,
          borderRight: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${COLORS.border}`, gap: 12, flexShrink: 0 }}>
          <motion.div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 900,
              fontSize: 13,
              color: "#fff",
              letterSpacing: 0.5,
            }}
            whileHover={{ scale: 1.05 }}
          >
            CP
          </motion.div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{ overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <span style={{ fontWeight: 900, fontSize: 15, color: COLORS.text, letterSpacing: 1 }}>CIPHER</span>
              <span style={{ fontWeight: 400, fontSize: 15, color: COLORS.accent, letterSpacing: 1 }}>POOL</span>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV_MAIN.map(item => {
            const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <motion.div key={item.to} whileHover={{ x: 4 }}>
                <NavLink to={item.to} title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: collapsed ? "12px 0" : "10px 14px",
                    margin: "2px 6px",
                    borderRadius: 10,
                    background: active ? `rgba(139, 92, 246, 0.15)` : "transparent",
                    borderLeft: active ? `3px solid ${COLORS.accent}` : "3px solid transparent",
                    color: active ? COLORS.accent : COLORS.text2,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.15s",
                    justifyContent: collapsed ? "center" : "flex-start",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                </NavLink>
              </motion.div>
            );
          })}

          {/* Admin section */}
          {canAdmin && (
            <>
              <div style={{ margin: "8px 10px", height: 1, background: COLORS.border }} />
              {!collapsed && (
                <motion.button onClick={() => setAdminOpen(v => !v)} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 14px",
                  margin: "2px 6px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.text3,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
                whileHover={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span style={{ fontSize: 14 }}>⚙️</span>
                  <span style={{ flex: 1, textAlign: "left" }}>ADMINISTRATION</span>
                  <motion.span animate={{ rotate: adminOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ fontSize: 10 }}>▼</motion.span>
                </motion.button>
              )}
              <AnimatePresence>
                {(adminOpen || collapsed) && visibleAdmin.map(item => {
                  const active = location.pathname === item.to;
                  return (
                    <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                      <NavLink to={item.to} title={collapsed ? item.label : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: collapsed ? "12px 0" : "8px 14px",
                          margin: "2px 6px",
                          borderRadius: 10,
                          background: active ? "rgba(240, 160, 48, 0.15)" : "transparent",
                          borderLeft: active ? `3px solid #f0a030` : "3px solid transparent",
                          color: active ? "#f0a030" : COLORS.text3,
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: active ? 600 : 400,
                          transition: "all 0.15s",
                          justifyContent: collapsed ? "center" : "flex-start",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </nav>

        {/* User card */}
        {profile && (
          <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: collapsed ? "12px 0" : "12px 10px", flexShrink: 0 }}>
            <Link to="/profile" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {profile.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</p>
                  <p style={{ color: COLORS.text3, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{profile.role}</p>
                </div>
              )}
            </Link>
          </div>
        )}
      </motion.aside>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 64,
          background: COLORS.sidebar,
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          flexShrink: 0,
        }}>
          <motion.button
            onClick={() => setCollapsed(v => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.text2,
              fontSize: 16,
              flexShrink: 0,
            }}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.95 }}
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </motion.button>

          <div style={{ flex: 1 }} />

          {/* Balance */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 12, color: COLORS.text3 }}>💎</span>
            <span style={{ fontWeight: 600, color: COLORS.text, fontSize: 13 }}>{balance.toLocaleString()}</span>
          </div>

          {/* Notifications */}
          <motion.button
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.text2,
            }}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={18} />
          </motion.button>

          {/* Settings */}
          <motion.button
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.text2,
            }}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>

          {/* Logout */}
          <motion.button
            onClick={handleLogout}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.text2,
            }}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={18} />
          </motion.button>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          <Outlet context={{ profile }} />
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
