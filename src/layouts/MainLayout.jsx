import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const NAV_MAIN = [
  { to: "/dashboard",     label: "Tableau de bord",  icon: "⚡" },
  { to: "/tournaments",   label: "Tournois",          icon: "🏆" },
  { to: "/leaderboard",   label: "Classement",        icon: "📊" },
  { to: "/clans",         label: "Clans",             icon: "⚔️" },
  { to: "/teams",         label: "Équipes",           icon: "🛡️" },
  { to: "/news",          label: "Actualités",        icon: "📰" },
  { to: "/chat",          label: "Chat global",       icon: "💬" },
  { to: "/store",         label: "Boutique",          icon: "🛍️" },
  { to: "/wallet",        label: "Portefeuille",      icon: "💎" },
  { to: "/achievements",  label: "Achievements",      icon: "🏅" },
  { to: "/daily-rewards", label: "Daily Rewards",     icon: "🎁" },
  { to: "/stats",         label: "Mes Stats",         icon: "📈" },
  { to: "/hall-of-fame",  label: "Hall of Fame",      icon: "🌟" },
  { to: "/team",          label: "Notre Équipe",      icon: "👥" },
  { to: "/support",       label: "Support",           icon: "🎧" },
  { to: "/profile",       label: "Mon Profil",        icon: "👤" },
];

const NAV_ADMIN = [
  { to: "/admin",          label: "Administration",   icon: "🛡️", roles: ["admin","super_admin","fondateur","founder"] },
  { to: "/admin/news",     label: "Actualités",       icon: "📰", roles: ["admin","super_admin","fondateur","founder"] },
  { to: "/admin/results",  label: "Résultats",        icon: "📋", roles: ["admin","super_admin","fondateur","founder"] },
  { to: "/admin-store",    label: "Boutique Admin",   icon: "🏪", roles: ["admin","super_admin"] },
  { to: "/designer",       label: "Designer",         icon: "🎨", roles: ["designer","admin","super_admin"] },
  { to: "/founder",        label: "Panel Fondateur",  icon: "⚡", roles: ["founder","fondateur","super_admin"] },
  { to: "/create-tournament", label: "Créer Tournoi", icon: "➕", roles: ["founder","fondateur","super_admin"] },
  { to: "/super-admin",    label: "Super Admin",      icon: "👑", roles: ["super_admin"] },
];

const S = {
  bg:       "#0b0b14",
  sidebar:  "#0f0f1a",
  surface:  "#14141f",
  card:     "rgba(255,255,255,0.03)",
  border:   "rgba(255,255,255,0.07)",
  accent:   "#00c49a",
  accentD:  "#009e7a",
  orange:   "#f0a030",
  text:     "#e8e8f4",
  text2:    "#9898b8",
  text3:    "#5c5c7a",
};

export default function MainLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [profile,    setProfile]    = useState(null);
  const [balance,    setBalance]    = useState(0);
  const [collapsed,  setCollapsed]  = useState(false);
  const [adminOpen,  setAdminOpen]  = useState(false);
  const [loading,    setLoading]    = useState(true);

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

  const visibleAdmin = NAV_ADMIN.filter(i => i.roles.includes(profile?.role));
  const canAdmin = visibleAdmin.length > 0;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: S.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${S.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: S.text3, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 3 }}>CHARGEMENT</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const sideW = collapsed ? 60 : 240;

  return (
    <div style={{ display: "flex", height: "100vh", background: S.bg, overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sideW, minWidth: sideW, height: "100vh",
        background: S.sidebar,
        borderRight: `1px solid ${S.border}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.22s ease",
        overflow: "hidden", flexShrink: 0,
        position: "relative", zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${S.border}`, gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${S.accent},${S.accentD})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900, fontSize: 11, color: "#fff", letterSpacing: 0.5 }}>
            CP
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 900, fontSize: 14, color: S.text, letterSpacing: 1 }}>CIPHER</span>
              <span style={{ fontWeight: 400, fontSize: 14, color: S.accent, letterSpacing: 1 }}>POOL</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV_MAIN.map(item => {
            const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: collapsed ? "11px 0" : "9px 14px",
                  margin: "1px 6px", borderRadius: 8,
                  background: active ? `rgba(0,196,154,0.1)` : "transparent",
                  borderLeft: active ? `3px solid ${S.accent}` : "3px solid transparent",
                  color: active ? S.accent : S.text2,
                  textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Admin section */}
          {canAdmin && (
            <>
              <div style={{ margin: "8px 10px", height: 1, background: S.border }} />
              {!collapsed && (
                <button onClick={() => setAdminOpen(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 14px", margin: "1px 6px", borderRadius: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: S.text3, fontSize: 12, fontWeight: 700, letterSpacing: 1,
                }}>
                  <span style={{ fontSize: 14 }}>⚙️</span>
                  <span style={{ flex: 1, textAlign: "left" }}>ADMINISTRATION</span>
                  <span style={{ transform: adminOpen ? "rotate(180deg)" : "none", transition: "transform .2s", fontSize: 10 }}>▼</span>
                </button>
              )}
              <AnimatePresence>
                {(adminOpen || collapsed) && visibleAdmin.map(item => {
                  const active = location.pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: collapsed ? "11px 0" : "8px 14px",
                        margin: "1px 6px", borderRadius: 8,
                        background: active ? "rgba(240,160,48,0.1)" : "transparent",
                        borderLeft: active ? `3px solid ${S.orange}` : "3px solid transparent",
                        color: active ? S.orange : S.text3,
                        textDecoration: "none", fontSize: 12, fontWeight: active ? 600 : 400,
                        transition: "all 0.15s",
                        justifyContent: collapsed ? "center" : "flex-start",
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </nav>

        {/* User card */}
        {profile && (
          <div style={{ borderTop: `1px solid ${S.border}`, padding: collapsed ? "12px 0" : "12px 10px", flexShrink: 0 }}>
            <Link to="/profile" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${S.border}`, justifyContent: collapsed ? "center" : "flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${S.accent},${S.accentD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {profile.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: S.text, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</p>
                  <p style={{ color: S.text3, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{profile.role}</p>
                </div>
              )}
            </Link>
          </div>
        )}
      </aside>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 56, background: S.sidebar, borderBottom: `1px solid ${S.border}`,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(v => !v)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${S.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: S.text2, fontSize: 16, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ☰
          </button>

          <div style={{ flex: 1 }} />

          {/* Balance */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(0,196,154,0.08)", border: `1px solid rgba(0,196,154,0.18)` }}>
            <span style={{ fontSize: 14 }}>💎</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: S.accent }}>
              {balance.toLocaleString("fr-FR")}
            </span>
          </div>

          {/* Notifications placeholder */}
          <button style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${S.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: S.text2, position: "relative" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            🔔
          </button>

          {/* Logout */}
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${S.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: S.text2 }}
            title="Déconnexion"
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ↩
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", background: S.bg }}>
          <Outlet context={{ profile, balance, setBalance, refreshProfile }} />
        </main>
      </div>
    </div>
  );
}
